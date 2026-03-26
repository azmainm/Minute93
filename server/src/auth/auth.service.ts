import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';

const SALT_ROUNDS = 10;

interface JwtPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<{ accessToken: string }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(signupDto.password, SALT_ROUNDS);

    const user = this.userRepository.create({
      email: signupDto.email,
      password_hash: passwordHash,
      name: signupDto.name || null,
      timezone: signupDto.timezone || null,
      auth_provider: 'credentials',
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`New user signed up: ${savedUser.email}`);

    return this.generateToken(savedUser);
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    user.last_login_at = new Date();
    await this.userRepository.save(user);

    this.logger.log(`User logged in: ${user.email}`);
    return this.generateToken(user);
  }

  async findOrCreateGoogleUser(profile: {
    email: string;
    name: string;
    avatar_url: string;
  }): Promise<{ accessToken: string }> {
    let user = await this.userRepository.findOne({
      where: { email: profile.email },
    });

    if (!user) {
      user = this.userRepository.create({
        email: profile.email,
        name: profile.name,
        avatar_url: profile.avatar_url,
        auth_provider: 'google',
      });
      user = await this.userRepository.save(user);
      this.logger.log(`New Google user created: ${user.email}`);
    }

    user.last_login_at = new Date();
    await this.userRepository.save(user);

    return this.generateToken(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || user.auth_provider !== 'credentials' || !user.password_hash) {
      throw new UnauthorizedException(
        'Password change is only available for email/password accounts',
      );
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.password_hash,
    );

    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.password_hash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.userRepository.save(user);
    this.logger.log(`Password changed for user: ${user.email}`);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'password_hash'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.favorite_team !== undefined) user.favorite_team = dto.favorite_team;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;

    const saved = await this.userRepository.save(user);
    const { password_hash, ...profile } = saved;
    return profile;
  }

  private generateToken(user: User): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isAdmin: user.is_admin,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
