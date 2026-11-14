package com.fixercity.item;

import com.fixercity.keypage.DamageKind;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPageHelper;
import com.fixercity.keypage.KeyPages;
import com.fixercity.keypage.Resist;
import java.util.List;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;

/** 책장 아이템. 우클릭하면 몸에 낀다 (이미 낀 책장은 인벤토리로 돌아온다). */
public class KeyPageItem extends Item {
    private final String pageId;

    public KeyPageItem(String pageId, Properties properties) {
        super(properties);
        this.pageId = pageId;
    }

    public KeyPage page() {
        return KeyPages.byId(pageId);
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        KeyPage page = page();
        if (page == null) {
            return InteractionResultHolder.pass(stack);
        }
        if (KeyPageHelper.getPage(player) == page) {
            if (!level.isClientSide()) {
                player.displayClientMessage(Component.translatable("message.fixercity.page_already"), true);
            }
            return InteractionResultHolder.fail(stack);
        }
        if (player instanceof ServerPlayer serverPlayer) {
            KeyPageHelper.equip(serverPlayer, page);
            if (!player.getAbilities().instabuild) {
                stack.shrink(1);
            }
            level.playSound(null, player.getX(), player.getY(), player.getZ(),
                    SoundEvents.BOOK_PAGE_TURN, SoundSource.PLAYERS, 1.0F, 0.8F);
            player.displayClientMessage(Component.translatable("message.fixercity.page_equipped",
                    Component.translatable(page.translationKey()).withStyle(ChatFormatting.GOLD)), true);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        KeyPage page = page();
        if (page == null) {
            return;
        }
        appendPageInfo(page, tooltip);
        tooltip.add(Component.translatable("tooltip.fixercity.page_use").withStyle(ChatFormatting.DARK_GRAY));
    }

    /** 책장 정보 툴팁 (명령어 출력에서도 재사용). */
    public static void appendPageInfo(KeyPage page, List<Component> out) {
        out.add(Component.translatable("tooltip.fixercity.grade", page.grade()).withStyle(ChatFormatting.GOLD));
        out.add(Component.translatable(page.translationKey() + ".lore").withStyle(ChatFormatting.GRAY, ChatFormatting.ITALIC));
        out.add(Component.translatable("tooltip.fixercity.page_stats",
                fmt(page.health()), fmt(page.stagger()), fmt(page.armor()), String.format("%+d%%", Math.round(page.speed() * 100)))
                .withStyle(ChatFormatting.WHITE));
        out.add(resistLine("tooltip.fixercity.hp_resist", page.slash(), page.pierce(), page.blunt()));
        out.add(resistLine("tooltip.fixercity.stagger_resist", page.staggerSlash(), page.staggerPierce(), page.staggerBlunt()));
        out.add(Component.translatable("tooltip.fixercity.passive",
                Component.translatable(page.passive().nameKey()).withStyle(ChatFormatting.LIGHT_PURPLE)).withStyle(ChatFormatting.GRAY));
        out.add(Component.literal("  ").append(Component.translatable(page.passive().descKey())).withStyle(ChatFormatting.DARK_PURPLE));
    }

    private static Component resistLine(String key, Resist slash, Resist pierce, Resist blunt) {
        return Component.translatable(key,
                resist(DamageKind.SLASH, slash), resist(DamageKind.PIERCE, pierce), resist(DamageKind.BLUNT, blunt))
                .withStyle(ChatFormatting.GRAY);
    }

    private static MutableComponent resist(DamageKind kind, Resist resist) {
        return Component.translatable(kind.translationKey()).withStyle(kind.color())
                .append(Component.literal(" "))
                .append(Component.translatable(resist.translationKey()).withStyle(resist.color()));
    }

    private static String fmt(float v) {
        return v == (int) v ? String.valueOf((int) v) : String.valueOf(v);
    }
}
