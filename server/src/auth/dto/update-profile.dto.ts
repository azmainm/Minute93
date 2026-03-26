import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  favorite_team?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;
}
