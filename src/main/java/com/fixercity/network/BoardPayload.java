package com.fixercity.network;

import com.fixercity.FixerCity;
import java.util.List;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.ComponentSerialization;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/**
 * 서버 -> 클라이언트: 의뢰 게시판 화면 데이터.
 * activeState: 0 = 진행 중인 의뢰 없음, 1 = 진행 중, 2 = 진행 중이고 지금 보고 가능.
 */
public record BoardPayload(Component profile, Component activeTitle, Component activeDetail, int activeState,
        List<Entry> entries) implements CustomPacketPayload {

    public record Entry(int id, Component title, Component objective, Component rewards, boolean allowed) {
        public static final StreamCodec<RegistryFriendlyByteBuf, Entry> STREAM_CODEC = StreamCodec.composite(
                ByteBufCodecs.VAR_INT, Entry::id,
                ComponentSerialization.STREAM_CODEC, Entry::title,
                ComponentSerialization.STREAM_CODEC, Entry::objective,
                ComponentSerialization.STREAM_CODEC, Entry::rewards,
                ByteBufCodecs.BOOL, Entry::allowed,
                Entry::new);
    }

    public static final Type<BoardPayload> TYPE = new Type<>(FixerCity.id("board"));

    public static final StreamCodec<RegistryFriendlyByteBuf, BoardPayload> STREAM_CODEC = StreamCodec.composite(
            ComponentSerialization.STREAM_CODEC, BoardPayload::profile,
            ComponentSerialization.STREAM_CODEC, BoardPayload::activeTitle,
            ComponentSerialization.STREAM_CODEC, BoardPayload::activeDetail,
            ByteBufCodecs.VAR_INT, BoardPayload::activeState,
            Entry.STREAM_CODEC.apply(ByteBufCodecs.list()), BoardPayload::entries,
            BoardPayload::new);

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
