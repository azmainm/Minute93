import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SearchQueryDto {
  @IsString()
  @MinLength(2)
  q: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit: number = 10;
}
