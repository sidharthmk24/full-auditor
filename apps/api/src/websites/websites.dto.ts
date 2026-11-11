import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class CreateWebsiteDto {
  @ApiProperty({ example: 'My Company Site' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: 'E-commerce platform', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'E-commerce', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxPages?: number;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxDepth?: number;
}

export class UpdateWebsiteDto {
  @ApiProperty({ example: 'Updated Company Site', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Updated description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'SaaS', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

