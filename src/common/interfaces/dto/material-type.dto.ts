import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
export class MaterialTypeDto {
    id: string
    name: string
    description: string
    createdAt?: Date | null;
    updatedAt?: Date | null;
}
export class CreateMaterialTypeDto {
    @ApiProperty({ example: 'Phụ kiện chống thủy lực' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'phục vụ việc chống thủy lực' })
    @IsString()
    @IsOptional()
    description?: string;
}

export class UpdateMaterialTypeDto {
    @ApiProperty({ example: 'Phụ kiện chống thủy lực' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'phục vụ việc chống thủy lực' })
    @IsString()
    @IsOptional()
    description?: string;
}