import {
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // register new user
  async create(createAuthDto: CreateAuthDto) {
    const { name, email, password } = createAuthDto;
    // check user is exist or not
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      throw new ConflictException('Email already exist');
    }

    //hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // insert into db
    const result = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    return result;
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

    return { accessToken, refreshToken, newUser };
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
