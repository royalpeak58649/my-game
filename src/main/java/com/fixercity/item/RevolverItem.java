package com.fixercity.item;

import com.fixercity.registry.ModDataComponents;
import com.fixercity.registry.ModItems;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.ProjectileUtil;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.HitResult;
import net.minecraft.world.phys.Vec3;

/**
 * 해결사 리볼버. 6연발, 즉발(히트스캔) 사격.
 * 우클릭 = 사격, 웅크리고 우클릭 또는 빈 실린더로 우클릭 = 재장전 (인벤토리의 탄환 소모).
 */
public class RevolverItem extends Item {
    public static final int CAPACITY = 6;
    private static final double RANGE = 40.0;
    private static final float DAMAGE = 9.0F;
    private static final int SHOT_COOLDOWN = 10;
    private static final int RELOAD_COOLDOWN = 40;

    public RevolverItem(Properties properties) {
        super(properties);
    }

    public static int getAmmo(ItemStack stack) {
        return stack.getOrDefault(ModDataComponents.AMMO.get(), 0);
    }

    private static void setAmmo(ItemStack stack, int ammo) {
        stack.set(ModDataComponents.AMMO.get(), ammo);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level instanceof ServerLevel serverLevel) {
            if (player.isShiftKeyDown() || getAmmo(stack) <= 0) {
                reload(serverLevel, player, stack);
            } else {
                shoot(serverLevel, player, stack, hand);
            }
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    private void reload(ServerLevel level, Player player, ItemStack stack) {
        int ammo = getAmmo(stack);
        int needed = CAPACITY - ammo;
        if (needed <= 0) {
            return;
        }
        int loaded = player.getAbilities().instabuild ? needed : takeBullets(player.getInventory(), needed);
        if (loaded <= 0) {
            player.displayClientMessage(Component.translatable("message.fixercity.no_bullets").withStyle(ChatFormatting.RED), true);
            level.playSound(null, player.getX(), player.getY(), player.getZ(),
                    SoundEvents.DISPENSER_FAIL, SoundSource.PLAYERS, 0.8F, 1.2F);
            player.getCooldowns().addCooldown(this, 10);
            return;
        }
        setAmmo(stack, ammo + loaded);
        player.getCooldowns().addCooldown(this, RELOAD_COOLDOWN);
        player.displayClientMessage(Component.translatable("message.fixercity.reloaded", ammo + loaded, CAPACITY), true);
        level.playSound(null, player.getX(), player.getY(), player.getZ(),
                SoundEvents.IRON_TRAPDOOR_CLOSE, SoundSource.PLAYERS, 0.7F, 1.6F);
    }

    /** 인벤토리에서 탄환을 최대 max개 꺼내고 실제 꺼낸 수를 돌려준다. */
    private static int takeBullets(Inventory inventory, int max) {
        int taken = 0;
        for (int i = 0; i < inventory.getContainerSize() && taken < max; i++) {
            ItemStack s = inventory.getItem(i);
            if (s.is(ModItems.FIXER_BULLET.get())) {
                int n = Math.min(s.getCount(), max - taken);
                s.shrink(n);
                taken += n;
            }
        }
        return taken;
    }

    private void shoot(ServerLevel level, Player player, ItemStack stack, InteractionHand hand) {
        setAmmo(stack, getAmmo(stack) - 1);

        Vec3 eye = player.getEyePosition();
        Vec3 look = player.getViewVector(1.0F);
        Vec3 end = eye.add(look.scale(RANGE));

        BlockHitResult blockHit = level.clip(new ClipContext(eye, end, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, player));
        if (blockHit.getType() != HitResult.Type.MISS) {
            end = blockHit.getLocation();
        }

        AABB searchBox = player.getBoundingBox().expandTowards(look.scale(RANGE)).inflate(1.0);
        EntityHitResult entityHit = ProjectileUtil.getEntityHitResult(level, player, eye, end, searchBox,
                e -> e != player && !e.isSpectator() && e.isPickable());
        if (entityHit != null) {
            end = entityHit.getLocation();
            Entity hit = entityHit.getEntity();
            if (hit instanceof LivingEntity living && living.isAlliedTo(player)) {
                // 아군 오사 방지
            } else {
                hit.invulnerableTime = 0;
                hit.hurt(player.damageSources().playerAttack(player), DAMAGE);
                level.sendParticles(ParticleTypes.CRIT, end.x, end.y, end.z, 8, 0.1, 0.1, 0.1, 0.2);
            }
        }

        // 탄도 궤적
        Vec3 path = end.subtract(eye);
        int steps = (int) Math.max(1, path.length() * 2);
        for (int i = 2; i <= steps; i++) {
            Vec3 p = eye.add(path.scale(i / (double) steps));
            level.sendParticles(ParticleTypes.SMOKE, p.x, p.y, p.z, 1, 0, 0, 0, 0);
        }
        Vec3 muzzle = eye.add(look.scale(0.8));
        level.sendParticles(ParticleTypes.FLAME, muzzle.x, muzzle.y - 0.1, muzzle.z, 3, 0.02, 0.02, 0.02, 0.01);

        level.playSound(null, player.getX(), player.getY(), player.getZ(),
                SoundEvents.FIREWORK_ROCKET_BLAST, SoundSource.PLAYERS, 1.5F, 0.6F);
        player.getCooldowns().addCooldown(this, SHOT_COOLDOWN);
        stack.hurtAndBreak(1, player, hand == InteractionHand.MAIN_HAND ? EquipmentSlot.MAINHAND : EquipmentSlot.OFFHAND);
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("tooltip.fixercity.ammo", getAmmo(stack), CAPACITY).withStyle(ChatFormatting.YELLOW));
        tooltip.add(Component.translatable(getDescriptionId() + ".lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        tooltip.add(Component.translatable(getDescriptionId() + ".ability").withStyle(ChatFormatting.GOLD));
        super.appendHoverText(stack, context, tooltip, flag);
    }
}
