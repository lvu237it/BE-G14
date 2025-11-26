import { ApiProperty } from "@nestjs/swagger"
import { IsDecimal, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator"

export class MaterialDto {
    id: string
    name: string
    code: string
    price: number
    specification: number
    material_type_id: string | null
    unit: string
    createdAt: Date | null;
    updatedAt: Date | null;
}

export class MaterialIemDto {
    id: string
    name: string
    code: string
    unit: string
}

export class MaterialListItemDto {
    id: string
    name: string
    code: string
    price: number
    specification: number
    material_type_id: string | null
    unit: string
    createdAt: Date | null;
    updatedAt: Date | null;
}

export class CreateMaterialDto { 
    @ApiProperty({example: 'gỗ chống bạch đàn'})
    @IsString()
    @IsNotEmpty()
    name:string

    @ApiProperty({example: 'sđ=8,4m2', description:'code là duy nhất'})
    @IsString()
    @IsNotEmpty()
    code:string

    @ApiProperty({example: 1000000, description:'code là duy nhất'})
    @IsNumber()
    @IsOptional()
    price:number

    @ApiProperty({example: 1000000, description:'quy cách'})
    @IsNumber()
    @IsOptional()
    specification:number

    @ApiProperty({example: 'fa242905-6c5d-4197-ae19-6d33af329896', description:'loại vật tư'})
    @IsUUID()
    @IsNotEmpty()
    material_type_id:string

    @ApiProperty({example: 'Cái', description:'đơn vị tính của vật tư'})
    @IsString()
    @IsNotEmpty()
    unit:string
}


export class UpdateMaterialDto { 
    @ApiProperty({example: 'gỗ chống bạch đàn'})
    @IsString()
    @IsNotEmpty()
    name:string

    @ApiProperty({example: 'sđ=8,4m2', description:'code là duy nhất'})
    @IsString()
    @IsNotEmpty()
    code:string

    @ApiProperty({example: 1000000, description:'code là duy nhất'})
    @IsNumber()
    price:number

    @ApiProperty({example: '3e965b53-521e-4a09-8f18-f5bc40fd8f0b', description:'loại vật tư'})
    @IsUUID()
    @IsNotEmpty()
    material_type_id:string

    @ApiProperty({example: 1000000, description:'quy cách'})
    @IsNumber()
    @IsOptional()
    specification:number

    @ApiProperty({example: 'Cái', description:'đơn vị tính của vật tư'})
    @IsString()
    @IsNotEmpty()
    unit:string
}