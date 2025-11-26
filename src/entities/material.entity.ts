import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base";
import { MaterialType } from "./material-type.entity";

@Entity({ name: 'material' })
export class Material extends BaseEntity {
    @Column({ type: "varchar", nullable: false })
    name: string

    @Column({ type: "varchar", nullable: false })
    code: string

    @Column({ type: "decimal", nullable: true })
    price: number

    @Column({ type: 'uuid', nullable: true })
    material_type_id: string;

    @ManyToOne(() => MaterialType, { nullable: false })
    @JoinColumn({ name: 'material_type_id' })
    materialType: MaterialType

    @Column({ type: 'varchar', nullable: false })
    unit: string

    @Column({ type: 'numeric', nullable: true })
    specification: number
}