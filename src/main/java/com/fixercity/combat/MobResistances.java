package com.fixercity.combat;

import com.fixercity.keypage.DamageKind;
import com.fixercity.keypage.Resist;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.animal.IronGolem;
import net.minecraft.world.entity.monster.AbstractSkeleton;
import net.minecraft.world.entity.monster.Slime;
import net.minecraft.world.entity.monster.Spider;
import net.minecraft.world.entity.monster.Zombie;

/** 책장이 없는 생물(몹)의 기본 내성. 체력/흐트러짐 공통. */
public final class MobResistances {
    private MobResistances() {}

    public static Resist of(LivingEntity entity, DamageKind kind) {
        if (entity instanceof AbstractSkeleton) {
            return pick(kind, Resist.NORMAL, Resist.ENDURE, Resist.WEAK);
        }
        if (entity instanceof Zombie) {
            return pick(kind, Resist.WEAK, Resist.NORMAL, Resist.ENDURE);
        }
        if (entity instanceof Spider) {
            return pick(kind, Resist.NORMAL, Resist.WEAK, Resist.NORMAL);
        }
        if (entity instanceof IronGolem) {
            return pick(kind, Resist.ENDURE, Resist.INEFFECTIVE, Resist.WEAK);
        }
        if (entity instanceof Slime) {
            return pick(kind, Resist.WEAK, Resist.ENDURE, Resist.ENDURE);
        }
        return Resist.NORMAL;
    }

    private static Resist pick(DamageKind kind, Resist slash, Resist pierce, Resist blunt) {
        return switch (kind) {
            case SLASH -> slash;
            case PIERCE -> pierce;
            case BLUNT -> blunt;
        };
    }
}
