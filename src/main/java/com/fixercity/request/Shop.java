package com.fixercity.request;

import com.fixercity.accessory.Accessory;
import com.fixercity.keypage.KeyPages;
import com.fixercity.registry.ModItems;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;

/** 협회 상점. 등급 이상이면 안(돈)으로 산다. 게시판 근처에서만. */
public final class Shop {
    public record Entry(String id, String category, Supplier<ItemStack> stack, int price, int minGrade) {}

    public static final List<String> CATEGORIES = List.of("supplies", "pages", "weapons", "accessories");
    private static final List<Entry> ENTRIES = new ArrayList<>();

    static {
        add("bullets", "supplies", () -> new ItemStack(ModItems.FIXER_BULLET.get(), 8), 40, 9);
        add("first_aid_kit", "supplies", () -> new ItemStack(ModItems.FIRST_AID_KIT.get()), 60, 9);
        add("painkiller", "supplies", () -> new ItemStack(ModItems.PAINKILLER.get()), 50, 9);
        add("flashbang", "supplies", () -> new ItemStack(ModItems.FLASHBANG.get()), 80, 8);
        add("smoke_bomb", "supplies", () -> new ItemStack(ModItems.SMOKE_BOMB.get()), 80, 8);
        add("blank_key_page", "supplies", () -> new ItemStack(ModItems.BLANK_KEY_PAGE.get()), 50, 9);

        add("page_rat", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.RAT)), 60, 9);
        add("page_office_fixer", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.OFFICE_FIXER)), 200, 8);
        add("page_zwei", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.ZWEI)), 1500, 6);
        add("page_shi", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.SHI)), 4000, 4);
        add("page_liu", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.LIU)), 6000, 3);
        add("page_seven", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.SEVEN)), 4000, 4);
        add("page_thumb", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.THUMB)), 6000, 3);
        add("page_kurokumo", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.KUROKUMO)), 2500, 5);

        add("page_yun", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.YUN)), 300, 8);
        add("page_hook", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.HOOK)), 300, 8);
        add("page_streetlight", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.STREETLIGHT)), 700, 7);
        add("page_molar", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.MOLAR)), 1500, 6);
        add("page_full_stop", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.FULL_STOP)), 2500, 5);
        add("page_dawn", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.DAWN)), 2500, 5);
        add("page_gaze", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.GAZE)), 2500, 5);
        add("page_wedge", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.WEDGE)), 2500, 5);
        add("page_workshop", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.WORKSHOP)), 2500, 5);
        add("page_jeong", "pages", () -> new ItemStack(ModItems.keyPageItem(KeyPages.JEONG)), 2500, 5);

        add("yun_machete", "weapons", () -> new ItemStack(ModItems.YUN_MACHETE.get()), 400, 8);
        add("hook_blade", "weapons", () -> new ItemStack(ModItems.HOOK_BLADE.get()), 400, 8);
        add("streetlight_staff", "weapons", () -> new ItemStack(ModItems.STREETLIGHT_STAFF.get()), 700, 7);
        add("molar_hammer", "weapons", () -> new ItemStack(ModItems.MOLAR_HAMMER.get()), 1200, 6);
        add("full_stop_rifle", "weapons", () -> new ItemStack(ModItems.FULL_STOP_RIFLE.get()), 1800, 5);
        add("dawn_sword", "weapons", () -> new ItemStack(ModItems.DAWN_SWORD.get()), 1800, 5);
        add("gaze_rapier", "weapons", () -> new ItemStack(ModItems.GAZE_RAPIER.get()), 1800, 5);
        add("wedge_spear", "weapons", () -> new ItemStack(ModItems.WEDGE_SPEAR.get()), 1800, 5);
        add("workshop_halberd", "weapons", () -> new ItemStack(ModItems.WORKSHOP_HALBERD.get()), 1800, 5);
        add("jeong_twin_blades", "weapons", () -> new ItemStack(ModItems.JEONG_TWIN_BLADES.get()), 1800, 5);
        add("revolver", "weapons", () -> new ItemStack(ModItems.FIXER_REVOLVER.get()), 300, 9);
        add("zwei_greatsword", "weapons", () -> new ItemStack(ModItems.ZWEI_GREATSWORD.get()), 1200, 6);
        add("shi_blade", "weapons", () -> new ItemStack(ModItems.SHI_BLADE.get()), 3000, 4);
        add("liu_gauntlet", "weapons", () -> new ItemStack(ModItems.LIU_GAUNTLET.get()), 4500, 3);
        add("seven_cane", "weapons", () -> new ItemStack(ModItems.SEVEN_CANE.get()), 3000, 4);
        add("thumb_rifle", "weapons", () -> new ItemStack(ModItems.THUMB_RIFLE.get()), 4500, 3);
        add("kurokumo_blade", "weapons", () -> new ItemStack(ModItems.KUROKUMO_BLADE.get()), 1500, 5);

        add("lucky_coin", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.LUCKY_COIN)), 150, 9);
        add("office_badge", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.OFFICE_BADGE)), 300, 8);
        add("zwei_armband", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.ZWEI_ARMBAND)), 900, 6);
        add("shi_tassel", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.SHI_TASSEL)), 2500, 4);
        add("liu_talisman", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.LIU_TALISMAN)), 3500, 3);
        add("seven_monocle", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.SEVEN_MONOCLE)), 2500, 4);
        add("thumb_bandolier", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.THUMB_BANDOLIER)), 3500, 3);
        add("kurokumo_knot", "accessories", () -> new ItemStack(ModItems.accessoryItem(Accessory.KUROKUMO_KNOT)), 1400, 5);
    }

    private Shop() {}

    private static void add(String id, String category, Supplier<ItemStack> stack, int price, int minGrade) {
        ENTRIES.add(new Entry(id, category, stack, price, minGrade));
    }

    public static Entry find(String id) {
        for (Entry e : ENTRIES) {
            if (e.id().equals(id)) {
                return e;
            }
        }
        return null;
    }

    public static void showCategories(ServerPlayer player) {
        player.sendSystemMessage(Component.translatable("ui.fixercity.shop_header").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD));
        player.sendSystemMessage(RequestUi.profileLine(player.server, player));
        MutableComponent line = Component.literal(" ");
        for (String c : CATEGORIES) {
            line.append(RequestUi.button("shop.fixercity.category." + c, "/shop " + c, ChatFormatting.AQUA,
                    Component.translatable("shop.fixercity.category." + c))).append(" ");
        }
        player.sendSystemMessage(line);
    }

    public static void showCategory(ServerPlayer player, String category) {
        int g = RequestManager.grade(player.server, player.getUUID());
        player.sendSystemMessage(Component.translatable("ui.fixercity.shop_header").withStyle(ChatFormatting.AQUA, ChatFormatting.BOLD)
                .append(Component.literal(" - ")).append(Component.translatable("shop.fixercity.category." + category)));
        for (Entry e : ENTRIES) {
            if (!e.category().equals(category)) {
                continue;
            }
            ItemStack stack = e.stack().get();
            boolean allowed = g <= e.minGrade();
            MutableComponent line = Component.literal(" ");
            if (allowed) {
                line.append(RequestUi.button("ui.fixercity.buy", "/shop buy " + e.id(), ChatFormatting.GREEN,
                        Component.translatable("ui.fixercity.buy_hover", stack.getHoverName(), String.format("%,d", e.price()))));
            } else {
                line.append(Component.literal("[ - ]").withStyle(ChatFormatting.DARK_GRAY));
            }
            line.append(" ").append(stack.getHoverName().copy().withStyle(ChatFormatting.WHITE));
            if (stack.getCount() > 1) {
                line.append(Component.literal(" x" + stack.getCount()).withStyle(ChatFormatting.GRAY));
            }
            line.append(Component.literal(" · " + String.format("%,d", e.price()) + "안").withStyle(ChatFormatting.YELLOW));
            line.append(Component.literal(" (" + e.minGrade() + "급~)").withStyle(allowed ? ChatFormatting.DARK_GRAY : ChatFormatting.RED));
            player.sendSystemMessage(line);
        }
    }

    /** GUI 화면용 상점 데이터. */
    public static void sendShop(ServerPlayer player, String category) {
        int g = RequestManager.grade(player.server, player.getUUID());
        List<com.fixercity.network.ShopPayload.Entry> list = new ArrayList<>();
        for (Entry e : ENTRIES) {
            if (e.category().equals(category)) {
                list.add(new com.fixercity.network.ShopPayload.Entry(e.id(), e.stack().get(), e.price(), e.minGrade(), g <= e.minGrade()));
            }
        }
        net.neoforged.neoforge.network.PacketDistributor.sendToPlayer(player,
                new com.fixercity.network.ShopPayload(RequestUi.profileLine(player.server, player), category, list));
    }

    public static boolean buy(ServerPlayer player, String id) {
        Entry e = find(id);
        if (e == null) {
            return false;
        }
        if (!RequestManager.nearBoard(player)) {
            player.sendSystemMessage(Component.translatable("message.fixercity.need_board").withStyle(ChatFormatting.RED));
            return false;
        }
        FixerSavedData data = RequestManager.data(player.server);
        FixerSavedData.Profile p = data.profile(player.getUUID());
        if (Grades.gradeFor(p.rep) > e.minGrade()) {
            player.sendSystemMessage(Component.translatable("message.fixercity.grade_too_low", e.minGrade()).withStyle(ChatFormatting.RED));
            return false;
        }
        if (p.ahn < e.price()) {
            player.sendSystemMessage(Component.translatable("message.fixercity.not_enough_ahn", String.format("%,d", e.price()))
                    .withStyle(ChatFormatting.RED));
            return false;
        }
        p.ahn -= e.price();
        data.setDirty();
        ItemStack stack = e.stack().get();
        Component name = stack.getHoverName();
        if (!player.getInventory().add(stack)) {
            player.drop(stack, false);
        }
        player.sendSystemMessage(Component.translatable("message.fixercity.bought", name, String.format("%,d", e.price()),
                String.format("%,d", p.ahn)).withStyle(ChatFormatting.GREEN));
        return true;
    }
}
