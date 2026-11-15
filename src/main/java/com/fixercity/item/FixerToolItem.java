package com.fixercity.item;

import com.fixercity.combat.CombatData;
import com.fixercity.combat.CombatHandler;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.effect.MobEffectInstance;
import net.minecraft.world.effect.MobEffects;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;

/** 해결사 보조 장비 (소모품). 우클릭으로 사용, 하나 소모. */
public class FixerToolItem extends Item {
    public enum Kind {
        /** 응급 키트: 즉시 체력 4 + 재생 III 3초 + 흐트러짐 50% 회복. */
        FIRST_AID(600),
        /** 섬광탄: 6칸 안의 적에게 실명 4초 + 흐트러짐 피해 10. */
        FLASHBANG(200),
        /** 연막탄: 나와 4칸 안의 아군 투명 5초, 주변 몹이 대상을 놓친다. */
        SMOKE_BOMB(400),
        /** 진통제: 힘 I, 저항 I 10초. 부작용으로 허기 10초. */
        PAINKILLER(600);

        private final int cooldown;

        Kind(int cooldown) {
            this.cooldown = cooldown;
        }
    }

    private final Kind kind;

    public FixerToolItem(Kind kind, Properties properties) {
        super(properties);
        this.kind = kind;
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level instanceof ServerLevel serverLevel) {
            apply(serverLevel, player);
            player.getCooldowns().addCooldown(this, kind.cooldown);
            if (!player.getAbilities().instabuild) {
                stack.shrink(1);
            }
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    private void apply(ServerLevel level, Player player) {
        double x = player.getX(), y = player.getY(), z = player.getZ();
        switch (kind) {
            case FIRST_AID -> {
                player.heal(4.0F);
                player.addEffect(new MobEffectInstance(MobEffects.REGENERATION, 60, 2));
                CombatData data = CombatHandler.dataFor(player);
                data.restore(level.getGameTime(), CombatHandler.staggerMax(player), 0.5F);
                level.sendParticles(ParticleTypes.HEART, x, y + 1.2, z, 5, 0.4, 0.3, 0.4, 0);
                level.playSound(null, x, y, z, SoundEvents.ARMOR_EQUIP_LEATHER.value(), SoundSource.PLAYERS, 1.0F, 1.3F);
            }
            case FLASHBANG -> {
                for (LivingEntity target : level.getEntitiesOfClass(LivingEntity.class, player.getBoundingBox().inflate(6.0),
                        t -> t != player && t.isAlive() && !(t instanceof Player) && !t.isAlliedTo(player))) {
                    target.addEffect(new MobEffectInstance(MobEffects.BLINDNESS, 80, 0), player);
                    target.addEffect(new MobEffectInstance(MobEffects.MOVEMENT_SLOWDOWN, 40, 2), player);
                    CombatHandler.addStagger(target, 10.0F);
                }
                level.sendParticles(ParticleTypes.FLASH, x, y + 1.5, z, 1, 0, 0, 0, 0);
                level.sendParticles(ParticleTypes.FIREWORK, x, y + 1.0, z, 40, 0.5, 0.5, 0.5, 0.3);
                level.playSound(null, x, y, z, SoundEvents.FIREWORK_ROCKET_LARGE_BLAST, SoundSource.PLAYERS, 2.0F, 1.2F);
            }
            case SMOKE_BOMB -> {
                List<Player> hidden = level.getEntitiesOfClass(Player.class, player.getBoundingBox().inflate(4.0),
                        p -> p.isAlive() && !p.isSpectator());
                for (Player p : hidden) {
                    p.addEffect(new MobEffectInstance(MobEffects.INVISIBILITY, 100, 0, false, false, true));
                }
                for (Mob mob : level.getEntitiesOfClass(Mob.class, player.getBoundingBox().inflate(16.0), m -> m instanceof Enemy)) {
                    if (mob.getTarget() instanceof Player p && hidden.contains(p)) {
                        mob.setTarget(null);
                    }
                }
                level.sendParticles(ParticleTypes.CAMPFIRE_COSY_SMOKE, x, y + 0.5, z, 60, 2.0, 1.0, 2.0, 0.01);
                level.playSound(null, x, y, z, SoundEvents.FIRE_EXTINGUISH, SoundSource.PLAYERS, 1.0F, 0.6F);
            }
            case PAINKILLER -> {
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_BOOST, 200, 0));
                player.addEffect(new MobEffectInstance(MobEffects.DAMAGE_RESISTANCE, 200, 0));
                player.addEffect(new MobEffectInstance(MobEffects.HUNGER, 200, 1));
                level.playSound(null, x, y, z, SoundEvents.GENERIC_DRINK, SoundSource.PLAYERS, 1.0F, 1.2F);
            }
        }
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable(getDescriptionId() + ".lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        tooltip.add(Component.translatable(getDescriptionId() + ".effect").withStyle(ChatFormatting.GOLD));
        tooltip.add(Component.translatable("tooltip.fixercity.cooldown", String.format("%.1f", kind.cooldown / 20.0F))
                .withStyle(ChatFormatting.DARK_GRAY));
    }
}
