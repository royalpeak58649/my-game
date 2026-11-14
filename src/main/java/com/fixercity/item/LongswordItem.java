package com.fixercity.item;

import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;

/** 해결사 장검. 기술: 돌진 베기 - 앞으로 약 5칸 돌진하며 경로상의 적을 벤다. */
public class LongswordItem extends FixerWeaponItem implements HasDamageKind {
    @Override
    public com.fixercity.keypage.DamageKind damageKind() {
        return com.fixercity.keypage.DamageKind.SLASH;
    }

    private static final double DASH_DISTANCE = 5.0;
    private static final double HIT_RADIUS = 1.6;
    private static final float DAMAGE_MULTIPLIER = 1.2F;

    public LongswordItem(Tier tier, Properties properties) {
        super(tier, properties, 100);
    }

    @Override
    protected boolean performAbility(ServerLevel level, Player player, ItemStack stack) {
        Vec3 dir = flatLook(player);
        if (dir == null) {
            return false;
        }
        Vec3 start = player.position().add(0, player.getBbHeight() * 0.5, 0);
        Vec3 end = start.add(dir.scale(DASH_DISTANCE));

        player.setDeltaMovement(dir.x * 1.6, 0.15, dir.z * 1.6);
        player.hurtMarked = true;

        float damage = (float) player.getAttributeValue(Attributes.ATTACK_DAMAGE) * DAMAGE_MULTIPLIER;
        AABB area = new AABB(start, end).inflate(HIT_RADIUS);
        for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class, area, t -> isValidTarget(player, t))) {
            Vec3 center = target.position().add(0, target.getBbHeight() * 0.5, 0);
            if (distanceToSegment(center, start, end) <= HIT_RADIUS + target.getBbWidth() * 0.5) {
                target.hurt(player.damageSources().playerAttack(player), damage);
                pushAway(player, target, 0.4);
            }
        }

        for (int i = 1; i <= 5; i++) {
            Vec3 p = start.add(dir.scale(i));
            level.sendParticles(ParticleTypes.SWEEP_ATTACK, p.x, p.y, p.z, 1, 0, 0, 0, 0);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(),
                SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, 0.8F);
        return true;
    }
}
