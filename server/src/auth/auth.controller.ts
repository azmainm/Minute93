import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { GoogleAuthGuard } from './guards/google-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: { user: { id: string } }) {
    const user = await this.authService.findById(req.user.id);
    if (!user) {
      return null;
    }
    const { password_hash, ...profile } = user;
    return profile;
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Request() req: { user: { email: string; name: string; avatar_url: string } },
    @Res() res: { redirect: (url: string) => void },
  ) {
    const { accessToken } = await this.authService.findOrCreateGoogleUser(req.user);
    const clientUrl = this.configService.get<string>('CLIENT_URL') || 'http://localhost:3001';
    res.redirect(`${clientUrl}/login?token=${accessToken}`);
  }
}
