package com.fixercity.network;

import com.fixercity.FixerCity;
import java.util.List;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.ComponentSerialization;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.world.item.ItemStack;

/** 서버 -> 클라이언트: 협회 상점 화면 데이터 (한 카테고리). */
public record ShopPayload(Component profile, String category, List<Entry> entries) implements CustomPacketPayload {

    public record Entry(String id, ItemStack stack, int price, int minGrade, boolean allowed) {
        public static final StreamCodec<RegistryFriendlyByteBuf, Entry> STREAM_CODEC = StreamCodec.composite(
                ByteBufCodecs.STRING_UTF8, Entry::id,
                ItemStack.STREAM_CODEC, Entry::stack,
                ByteBufCodecs.VAR_INT, Entry::price,
                ByteBufCodecs.VAR_INT, Entry::minGrade,
                ByteBufCodecs.BOOL, Entry::allowed,
                Entry::new);
    }

    public static final Type<ShopPayload> TYPE = new Type<>(FixerCity.id("shop"));

    public static final StreamCodec<RegistryFriendlyByteBuf, ShopPayload> STREAM_CODEC = StreamCodec.composite(
            ComponentSerialization.STREAM_CODEC, ShopPayload::profile,
            ByteBufCodecs.STRING_UTF8, ShopPayload::category,
            Entry.STREAM_CODEC.apply(ByteBufCodecs.list()), ShopPayload::entries,
            ShopPayload::new);

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
