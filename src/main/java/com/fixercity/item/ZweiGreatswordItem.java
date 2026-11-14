package com.fixercity.item;

import com.fixercity.combat.CombatData;
import com.fixercity.registry.ModAttachments;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.monster.Enemy;
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
 * 츠바이 대검. 기술: 수호 태세 3초 - 받는 물리 피해 60% 감소, 근접 공격자에게 반격(넉백 + 흐트러짐),
 * 주변 8칸의 적이 나를 노리게 한다. 대신 느려진다.
 * 공명(츠바이 협회): 5초 지속, 피해 75% 감소, 반격 흐트러짐 2배, 5칸 안의 아군에게 저항 II.
 */
public class ZweiGreatswordItem extends FixerWeaponItem {
    public ZweiGreatswordItem(Tier tier, Properties properties) {
        super(tier, properties, 300, "zwei");
    }

    @Override
    public DamageKind damageKind() {
        return DamageKind.SLASH;
    }

    @Override
    protected AbilityResult performAbility(ServerLevel level, Player player, ItemStack stack, boolean resonant) {
        int duration = resonant ? 100 : 60;
        CombatData data = player.getData(ModAttachments.COMBAT);
        data.guardUntil = level.getGameTime() + duration;
        data.guardEmpowered = resonant;
        player.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, duration, 0, false, false, true));

        for (Mob mob : level.getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(8.0),
                m -> m instanceof Enemy && m.isAlive())) {
            mob.setTarget(player);
        }
        if (resonant) {
            for (Player ally : level.getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(5.0),
                    p -> p != player && p.isAlive() && !p.isSpectator())) {
                ally.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, duration, 1, false, false, true));
            }
        }
        for (int i = 0; i < 16; i++) {
            double a = Math.PI * 2 * i / 16;
            level.sendParticles(ParticleTypes.CRIT, player.getX() + Math.cos(a) * 1.2, player.getY() + 1.0,
                    player.getZ() + Math.sin(a) * 1.2, 2, 0, 0.4, 0, 0);
        }
        level.playSound(null, player.getX(), player.getY(), player.getZ(), SoundEvents.ANVIL_PLACE, SoundSource.PLAYERS, 0.6F, 1.4F);
        return AbilityResult.USED;
    }
}
