package com.fixercity.item;

import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.SwordItem;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.Vec3;

/**
 * 해결사 근접 무기 공통 클래스.
 * 주 손에 들고 우클릭하면 무기 고유 기술을 쓰고, 재사용 대기시간이 걸린다.
 */
public abstract class FixerWeaponItem extends SwordItem {
    private final int cooldownTicks;

    protected FixerWeaponItem(Tier tier, Properties properties, int cooldownTicks) {
        super(tier, properties);
        this.cooldownTicks = cooldownTicks;
    }

    /** 서버에서만 호출. 기술이 실제로 발동했으면 true. */
    protected abstract boolean performAbility(ServerLevel level, Player player, ItemStack stack);

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (hand != InteractionHand.MAIN_HAND) {
            return InteractionResultHolder.pass(stack);
        }
        if (level instanceof ServerLevel serverLevel && performAbility(serverLevel, player, stack)) {
            player.getCooldowns().addCooldown(this, cooldownTicks);
            stack.hurtAndBreak(1, player, EquipmentSlot.MAINHAND);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable(getDescriptionId() + ".lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        tooltip.add(Component.translatable(getDescriptionId() + ".ability").withStyle(ChatFormatting.GOLD));
        tooltip.add(Component.translatable("tooltip.fixercity.cooldown", String.format("%.1f", cooldownTicks / 20.0F))
                .withStyle(ChatFormatting.DARK_GRAY));
        super.appendHoverText(stack, context, tooltip, flag);
    }

    // ---- 공용 유틸 ----

    /** 수평 시선 방향 (길이 1). 정면이 거의 수직이면 null. */
    protected static Vec3 flatLook(Player player) {
        Vec3 look = player.getLookAngle();
        Vec3 flat = new Vec3(look.x, 0, look.z);
        return flat.lengthSqr() < 1.0E-4 ? null : flat.normalize();
    }

    /** 대상이 플레이어 본인/아군/죽은 개체가 아닌지. */
    protected static boolean isValidTarget(Player player, LivingEntity target) {
        return target != player && target.isAlive() && !target.isAlliedTo(player) && !target.isSpectator();
    }

    /** 점 p에서 선분 a-b까지의 거리. */
    protected static double distanceToSegment(Vec3 p, Vec3 a, Vec3 b) {
        Vec3 ab = b.subtract(a);
        double lenSq = ab.lengthSqr();
        if (lenSq < 1.0E-6) {
            return p.distanceTo(a);
        }
        double t = Math.max(0, Math.min(1, p.subtract(a).dot(ab) / lenSq));
        return p.distanceTo(a.add(ab.scale(t)));
    }

    /** 대상을 플레이어 반대쪽으로 밀어낸다. */
    protected static void pushAway(Player player, LivingEntity target, double strength) {
        target.knockback(strength, player.getX() - target.getX(), player.getZ() - target.getZ());
    }
}
