import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import bcrypt from 'bcrypt';
import { LoginAuthDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { VerifyOtpDto } from './dto/verify.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // register new user
  async create(createAuthDto: CreateAuthDto) {
    const { name, email, password } = createAuthDto;

    // 1. Check existing user
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Hash OTP
    const otpHash = await bcrypt.hash(otp, 10);

    // 5. OTP expires after 10 min
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 6. Transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      await tx.emailVerification.create({
        data: {
          otpHash,
          expiresAt,
          userId: newUser.id,
        },
      });

      return newUser;
    });

    // 7. Send email
    await this.mailService.sendOtp(user.email, otp);

    // 8. Response
    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
    };
  }

  // verify email
  async verifyEmail(dto: VerifyOtpDto) {
    const { email, otp } = dto;

    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Already verified?
    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // 3. Find OTP
    const verification = await this.prisma.emailVerification.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!verification) {
      throw new BadRequestException('OTP not found');
    }

    // 4. Check Expiry
    if (verification.expiresAt < new Date()) {
      await this.prisma.emailVerification.delete({
        where: {
          userId: user.id,
        },
      });

      throw new BadRequestException('OTP expired');
    }

    // 5. Compare OTP
    const isMatch = await bcrypt.compare(otp, verification.otpHash as string);

    if (!isMatch) {
      throw new BadRequestException('Invalid OTP');
    }

    // 6. Success
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          isVerified: true,
        },
      });

      await tx.emailVerification.delete({
        where: {
          userId: user.id,
        },
      });
    });

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }
  // user login service
  async login(loginAuthDto: LoginAuthDto) {
    // extract from loginAuthDto
    const { email, password } = loginAuthDto;

    // find user from db
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }
    // check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Password not match');
    }
    // check user is verified or not
    if (!user.isVerified) {
      throw new ConflictException('Email not verified');
    }

    //generate access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as any,
      },
    );

    // generate refresh token
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
      },
    );
    // make refresh token has
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    // insert refresh token in db
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: hashedRefreshToken,
      },
    });

    const newUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { accessToken, refreshToken, user: newUser };
  }

  // generate new access token by refresh token
  async generateNewAccessToken(refreshToken: string) {
    if (!refreshToken) {
      throw new NotFoundException('Token not found');
    }

    // verify token
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // find user
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid Token');
    }

    if (!user.refreshToken) {
      throw new UnauthorizedException();
    }

    //compare token
    const matched = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!matched) {
      throw new UnauthorizedException('Invalid Token');
    }

    // if token matched generate new access token
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as any,
      },
    );

    // generate refresh token
    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
      },
    );
    // make refresh token has
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    // insert refresh token in db
    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: hashedRefreshToken,
      },
    });

    return accessToken;
  }
}

/**
 * @param
 * @Query
 * @Request
 */
