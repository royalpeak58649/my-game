package com.fixercity.network;

import com.fixercity.FixerCity;
import com.fixercity.registry.ModAttachments;
import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.world.entity.Entity;
import net.neoforged.neoforge.network.handling.IPayloadContext;

/** 서버 -> 클라이언트: 어떤 플레이어가 어떤 책장을 꼈는지 (옷 렌더링용). */
public record KeyPageSyncPayload(int entityId, String pageId) implements CustomPacketPayload {
    public static final Type<KeyPageSyncPayload> TYPE = new Type<>(FixerCity.id("key_page_sync"));

    public static final StreamCodec<ByteBuf, KeyPageSyncPayload> STREAM_CODEC = StreamCodec.composite(
            ByteBufCodecs.VAR_INT, KeyPageSyncPayload::entityId,
            ByteBufCodecs.STRING_UTF8, KeyPageSyncPayload::pageId,
            KeyPageSyncPayload::new);

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }

    public static void handle(KeyPageSyncPayload payload, IPayloadContext context) {
        Entity entity = context.player().level().getEntity(payload.entityId());
        if (entity != null) {
            entity.setData(ModAttachments.KEY_PAGE, payload.pageId());
        }
    }
}
