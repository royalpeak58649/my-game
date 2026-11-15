package com.fixercity.kit;

import com.fixercity.accessory.Accessory;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPages;
import com.fixercity.registry.ModItems;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.neoforged.neoforge.registries.DeferredItem;

/** 시작 키트 5종. 처음 접속하면 이 중 하나를 무작위로 받는다. */
public enum FixerKit {
    /** 검객: 장검 + 해결사 정장 + 사무소 해결사 책장. */
    SWORDSMAN("swordsman", () -> build(ModItems.FIXER_SUIT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_LONGSWORD.get()))),
    /** 중장: 철퇴 + 방탄 코트 + 사무소 해결사 책장. 앞에서 버티는 탱커. */
    BRAWLER("brawler", () -> build(ModItems.HEAVY_COAT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_MACE.get()))),
    /** 암살자: 단검 + 해결사 정장 + 사무소 해결사 책장 + 연막탄. */
    ASSASSIN("assassin", () -> build(ModItems.FIXER_SUIT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_DAGGER.get()), new ItemStack(ModItems.SMOKE_BOMB.get()))),
    /** 총잡이: 리볼버 + 탄환 12 + 보조 단검 + 해결사 정장 + 사무소 해결사 책장. */
    GUNNER("gunner", () -> build(ModItems.FIXER_SUIT_SET, KeyPages.OFFICE_FIXER, null,
            new ItemStack(ModItems.FIXER_REVOLVER.get()), new ItemStack(ModItems.FIXER_BULLET.get(), 12),
            new ItemStack(ModItems.FIXER_DAGGER.get()))),
    /** 뒷골목 출신: 쇠파이프 + 쥐 패거리 책장 + 행운의 동전 + 응급 키트 2. 갑옷은 없지만 잘 피한다. */
    BACKSTREET("backstreet", () -> build(List.of(), KeyPages.RAT, Accessory.LUCKY_COIN,
            new ItemStack(ModItems.RUSTY_PIPE.get()), new ItemStack(ModItems.FIRST_AID_KIT.get(), 2),
            new ItemStack(ModItems.FLASHBANG.get())));

    private final String id;
    private final Supplier<List<ItemStack>> contents;

    FixerKit(String id, Supplier<List<ItemStack>> contents) {
        this.id = id;
        this.contents = contents;
    }

    public String id() {
        return id;
    }

    /** 매번 새 ItemStack 목록을 만든다. 책장/장신구 아이템도 포함 (지급 시 자동 장착). */
    public List<ItemStack> createContents() {
        return contents.get();
    }

    private static List<ItemStack> build(List<? extends DeferredItem<?>> armorSet, KeyPage page, Accessory accessory,
            ItemStack... extra) {
        List<ItemStack> list = new ArrayList<>(List.of(extra));
        armorSet.forEach(item -> list.add(new ItemStack(item.get())));
        list.add(new ItemStack(ModItems.keyPageItem(page)));
        if (accessory != null) {
            list.add(new ItemStack(ModItems.accessoryItem(accessory)));
        }
        list.add(new ItemStack(Items.BREAD, 8));
        return list;
    }
}
