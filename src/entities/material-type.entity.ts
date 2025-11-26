import { Column, Entity } from "typeorm";
import { BaseEntity } from "./base";

@Entity({name:'material_type'})
export class MaterialType extends BaseEntity{
    @Column({type:'varchar',nullable:false})
    name: string

    @Column({type: 'varchar' ,length:255 ,nullable:false})
    description: string
}