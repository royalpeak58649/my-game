package com.fixercity.kit;

import com.fixercity.registry.ModItems;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.neoforged.neoforge.registries.DeferredItem;

/** 시작 키트. 나중에 키트 선택 화면에서 이 목록을 그대로 쓴다. */
public enum FixerKit {
    /** 검객: 장검 + 해결사 정장. 돌진으로 파고드는 기본형. */
    SWORDSMAN("swordsman", () -> withSet(ModItems.FIXER_SUIT_SET,
            new ItemStack(ModItems.FIXER_LONGSWORD.get()))),
    /** 중장: 철퇴 + 방탄 코트. 앞에서 버티는 탱커. */
    BRAWLER("brawler", () -> withSet(ModItems.HEAVY_COAT_SET,
            new ItemStack(ModItems.FIXER_MACE.get()))),
    /** 암살자: 단검 + 해결사 정장. 등 뒤를 노리는 기동형. */
    ASSASSIN("assassin", () -> withSet(ModItems.FIXER_SUIT_SET,
            new ItemStack(ModItems.FIXER_DAGGER.get()))),
    /** 총잡이: 리볼버 + 탄환 12발 + 보조 단검 + 해결사 정장. 탄환 관리가 관건. */
    GUNNER("gunner", () -> withSet(ModItems.FIXER_SUIT_SET,
            new ItemStack(ModItems.FIXER_REVOLVER.get()),
            new ItemStack(ModItems.FIXER_BULLET.get(), 12),
            new ItemStack(ModItems.FIXER_DAGGER.get())));

    private final String id;
    private final Supplier<List<ItemStack>> contents;

    FixerKit(String id, Supplier<List<ItemStack>> contents) {
        this.id = id;
        this.contents = contents;
    }

    public String id() {
        return id;
    }

    /** 매번 새 ItemStack 목록을 만든다. */
    public List<ItemStack> createContents() {
        return contents.get();
    }

    private static List<ItemStack> withSet(List<? extends DeferredItem<?>> armorSet, ItemStack... extra) {
        List<ItemStack> list = new ArrayList<>(List.of(extra));
        armorSet.forEach(item -> list.add(new ItemStack(item.get())));
        list.add(new ItemStack(Items.BREAD, 8));
        return list;
    }
}
