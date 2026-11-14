package com.fixercity.item;

import com.fixercity.keypage.DamageKind;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.phys.Vec3;

/** 해결사 장검. 기술: 돌진 베기. 공명(사무소 해결사): 돌진 피해 +25%. */
public class LongswordItem extends FixerWeaponItem {
    public LongswordItem(Tier tier, Properties properties) {
        super(tier, properties, 100, "office_fixer");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.SLASH;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        Vec3 dir = flatLook(player);
        if (dir == null) {
            return AbilityResult.FAILED;
        }
        Vec3 start = player.position().add(0, 1, 0);
        float damage = attackDamage(player) * (resonant ? 1.5F : 1.2F);
        for (LivingEntity target : dash(level, player, dir, 5.0, 1.6, 1.6)) {
            strike(player, target, damage);
            pushAway(player, target, 0.4);
        }
        for (int i = 1; i <= 5; i++) {
            Vec3 p = start.add(dir.scale(i));
            level.sendParticles(ParticleTypes.SWEEP_ATTACK, p.x, p.y, p.z, 1, 0, 0, 0, 0);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, 0.8F);
        return AbilityResult.USED;
    }
}
