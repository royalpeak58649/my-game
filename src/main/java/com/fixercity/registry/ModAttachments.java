package com.fixercity.registry;

import com.fixercity.FixerCity;
import com.fixercity.combat.CombatData;
import com.mojang.serialization.Codec;
import net.neoforged.neoforge.attachment.AttachmentType;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;
import net.neoforged.neoforge.registries.NeoForgeRegistries;

public final class ModAttachments {
    public static final DeferredRegister<AttachmentType<?>> REGISTER =
            DeferredRegister.create(NeoForgeRegistries.ATTACHMENT_TYPES, FixerCity.MODID);

    /**
     * 플레이어가 낀 책장 id ("" = 없음). 저장되지만 사망 시 복사되지 않으므로 죽으면 잃는다.
     * 클라이언트에도 동기화되어 옷 렌더링에 쓰인다.
     */
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<String>> KEY_PAGE =
            REGISTER.register("key_page", () -> AttachmentType.builder(() -> "").serialize(Codec.STRING).build());

    /** 흐트러짐 게이지 등 전투 중 임시 상태 (저장 안 함). 모든 생물에 붙는다. */
    public static final DeferredHolder<AttachmentType<?>, AttachmentType<CombatData>> COMBAT =
            REGISTER.register("combat", () -> AttachmentType.builder(() -> new CombatData()).build());

    private ModAttachments() {}
}
