package com.fixercity.item;

import java.util.List;
import com.fixercity.combat.CombatHandler;
import com.fixercity.keypage.DamageKind;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.phys.Vec3;

/**
 * 시 협회 발도검. 기술: 일섬 - 7칸을 순식간에 가로지르며 벤다. 첫 대상은 2배 피해.
 * 공명(시 협회): 베인 모든 적에게 흐트러짐 피해 8, 일섬으로 적을 쓰러뜨리면 대기시간 초기화.
 */
public class ShiBladeItem extends FixerWeaponItem {
    public ShiBladeItem(Tier tier, Properties properties) {
        super(tier, properties, 140, "shi");
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
        List<LivingEntity> hits = dash(level, player, dir, 7.0, 2.2, 1.2);
        float damage = attackDamage(player);
        boolean killed = false;
        for (int i = 0; i < hits.size(); i++) {
            LivingEntity target = hits.get(i);
            strike(player, target, i == 0 ? damage * 2.0F : damage);
            if (resonant) {
                CombatHandler.addStagger(target, 8.0F);
            }
            killed |= target.isDeadOrDying();
        }
        for (int i = 0; i <= 14; i++) {
            Vec3 p = start.add(dir.scale(i * 0.5));
            level.sendParticles(ParticleTypes.END_ROD, p.x, p.y, p.z, 1, 0, 0, 0, 0);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.PLAYER_ATTACK_SWEEP, SoundSource.PLAYERS, 1.0F, 1.6F);
        return resonant && killed ? AbilityResult.USED_NO_COOLDOWN : AbilityResult.USED;
    }
}
