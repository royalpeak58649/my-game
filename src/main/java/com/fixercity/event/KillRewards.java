package com.fixercity.event;

import com.fixercity.reception.ReceptionManager;
import com.fixercity.registry.ModItems;
import com.fixercity.request.RequestManager;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.neoforge.event.entity.living.LivingDeathEvent;

/**
 * 우민(일러저) 처치 보상: 플레이어가 잡으면 소소한 안 + 가끔 탄환·소모품.
 * 현상범·이벤트 몹·도서관 사서는 이미 따로 보상이 있어서 제외.
 */
public final class KillRewards {
    private KillRewards() {}

    /** 처치 보상 (최소, 최대 안). 우민이 아니면 null. */
    private static int[] reward(EntityType<?> type) {
        if (type == EntityType.PILLAGER) return new int[] {10, 20};
        if (type == EntityType.VINDICATOR) return new int[] {15, 25};
        if (type == EntityType.EVOKER) return new int[] {40, 60};
        if (type == EntityType.ILLUSIONER) return new int[] {30, 50};
        if (type == EntityType.WITCH) return new int[] {10, 20};
        if (type == EntityType.RAVAGER) return new int[] {50, 80};
        return null;
    }

    @SubscribeEvent
    public static void onDeath(LivingDeathEvent event) {
        LivingEntity dead = event.getEntity();
        if (!(dead.level() instanceof ServerLevel level) || !(event.getSource().getEntity() instanceof ServerPlayer killer)) {
            return;
        }
        if (dead.getPersistentData().contains(CityEvents.EVENT_TAG)
                || dead.getPersistentData().contains(RequestManager.BOUNTY_TAG)
                || dead.getPersistentData().contains(ReceptionManager.RECEPTION_TAG)) {
            return;
        }
        int[] range = reward(dead.getType());
        if (range == null) {
            return;
        }
        RandomSource random = level.random;
        int ahn = range[0] + random.nextInt(range[1] - range[0] + 1);
        RequestManager.addAhn(level.getServer(), killer.getUUID(), ahn);
        killer.displayClientMessage(Component.translatable("message.fixercity.kill_reward", dead.getType().getDescription(), ahn)
                .withStyle(ChatFormatting.GOLD), true);

        // 가끔 전리품
        ItemStack drop = ItemStack.EMPTY;
        int roll = random.nextInt(100);
        if (roll < 30) {
            drop = new ItemStack(ModItems.FIXER_BULLET.get(), 1 + random.nextInt(3));
        } else if (roll < 38) {
            drop = new ItemStack(ModItems.FIRST_AID_KIT.get());
        } else if (roll < 44) {
            drop = new ItemStack(ModItems.PAINKILLER.get());
        } else if (roll < 47) {
            drop = new ItemStack(ModItems.BLANK_KEY_PAGE.get());
        }
        if (!drop.isEmpty()) {
            level.addFreshEntity(new ItemEntity(level, dead.getX(), dead.getY() + 0.5, dead.getZ(), drop));
        }
    }
}
