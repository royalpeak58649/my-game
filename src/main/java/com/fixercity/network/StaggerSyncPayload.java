package com.fixercity.network;

import com.fixercity.FixerCity;
import io.netty.buffer.ByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/** 서버 -> 클라이언트: 흐트러짐 게이지 (내 것 또는 방금 때린 대상). HUD 표시용. */
public record StaggerSyncPayload(int entityId, float current, float max, boolean staggered) implements CustomPacketPayload {
    public static final Type<StaggerSyncPayload> TYPE = new Type<>(FixerCity.id("stagger_sync"));

    public static final StreamCodec<ByteBuf, StaggerSyncPayload> STREAM_CODEC = StreamCodec.composite(
            ByteBufCodecs.VAR_INT, StaggerSyncPayload::entityId,
            ByteBufCodecs.FLOAT, StaggerSyncPayload::current,
            ByteBufCodecs.FLOAT, StaggerSyncPayload::max,
            ByteBufCodecs.BOOL, StaggerSyncPayload::staggered,
            StaggerSyncPayload::new);

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
