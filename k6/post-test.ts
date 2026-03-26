import { readFileSync } from 'fs';
import { Client } from 'pg';
import 'dotenv/config';

interface K6Summary {
  metrics: {
    http_req_duration?: {
      values: {
        'p(50)': number;
        'p(95)': number;
        'p(99)': number;
      };
    };
    http_req_failed?: {
      values: {
        rate: number;
      };
    };
    http_reqs?: {
      values: {
        count: number;
        rate: number;
      };
    };
    vus_max?: {
      values: {
        max: number;
      };
    };
  };
}

const THRESHOLDS = {
  P95_MS: 500,
  ERROR_RATE: 0.01,
  CONSUMER_LAG_MS: 3000,
};

async function main() {
  const summaryPath = process.argv[2];
  const testName = process.argv[3] || 'unnamed-test';

  if (!summaryPath) {
    console.error('Usage: npx tsx k6/post-test.ts <summary.json> [test-name]');
    process.exit(1);
  }

  const raw = readFileSync(summaryPath, 'utf-8');
  const summary: K6Summary = JSON.parse(raw);

  const metrics = summary.metrics;
  const duration = metrics.http_req_duration?.values;
  const failed = metrics.http_req_failed?.values;
  const reqs = metrics.http_reqs?.values;
  const vusMax = metrics.vus_max?.values?.max || 0;

  const p50 = duration?.['p(50)'] || 0;
  const p95 = duration?.['p(95)'] || 0;
  const p99 = duration?.['p(99)'] || 0;
  const errorRate = (failed?.rate || 0) * 100;
  const totalRequests = reqs?.count || 0;
  const rps = reqs?.rate || 0;

  // Determine pass/fail
  const bottlenecks: string[] = [];
  if (p95 > THRESHOLDS.P95_MS) {
    bottlenecks.push(`p95 response ${p95.toFixed(0)}ms exceeds ${THRESHOLDS.P95_MS}ms threshold`);
  }
  if (errorRate > THRESHOLDS.ERROR_RATE * 100) {
    bottlenecks.push(`error rate ${errorRate.toFixed(2)}% exceeds ${(THRESHOLDS.ERROR_RATE * 100).toFixed(1)}% threshold`);
  }

  const passed = bottlenecks.length === 0;
  const bottleneckStr = bottlenecks.length > 0 ? bottlenecks.join('; ') : null;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    await client.query(
      `INSERT INTO load_test_runs
       (test_name, started_at, ended_at, virtual_users_peak, total_requests,
        requests_per_second, error_rate_pct, p50_response_ms, p95_response_ms,
        p99_response_ms, bottleneck_identified, passed, config_json)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        testName,
        new Date().toISOString(),
        vusMax,
        totalRequests,
        rps.toFixed(2),
        errorRate.toFixed(2),
        p50.toFixed(2),
        p95.toFixed(2),
        p99.toFixed(2),
        bottleneckStr,
        passed,
        JSON.stringify({
          summary_file: summaryPath,
          thresholds: THRESHOLDS,
        }),
      ],
    );

    console.log(`\n✓ Load test results saved to database`);
    console.log(`  Test: ${testName}`);
    console.log(`  VUs peak: ${vusMax}`);
    console.log(`  Requests: ${totalRequests} (${rps.toFixed(1)} req/s)`);
    console.log(`  p50: ${p50.toFixed(0)}ms | p95: ${p95.toFixed(0)}ms | p99: ${p99.toFixed(0)}ms`);
    console.log(`  Error rate: ${errorRate.toFixed(2)}%`);
    console.log(`  Result: ${passed ? 'PASS ✓' : 'FAIL ✗'}`);
    if (bottleneckStr) {
      console.log(`  Bottleneck: ${bottleneckStr}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Post-test script failed:', error.message);
  process.exit(1);
});
