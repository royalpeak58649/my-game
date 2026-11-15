package com.fixercity.network;

import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import net.neoforged.neoforge.network.registration.PayloadRegistrar;

public final class ModNetwork {
    private ModNetwork() {}

    public static void register(RegisterPayloadHandlersEvent event) {
        PayloadRegistrar registrar = event.registrar("1");
        registrar.playToClient(KeyPageSyncPayload.TYPE, KeyPageSyncPayload.STREAM_CODEC, KeyPageSyncPayload::handle);
        // 아래 핸들러는 클라이언트에서만 실행된다 (서버는 이 패킷을 받지 않는다)
        registrar.playToClient(StaggerSyncPayload.TYPE, StaggerSyncPayload.STREAM_CODEC,
                (payload, context) -> com.fixercity.client.ClientPayloads.stagger(payload));
        registrar.playToClient(BoardPayload.TYPE, BoardPayload.STREAM_CODEC,
                (payload, context) -> com.fixercity.client.ClientPayloads.board(payload));
        registrar.playToClient(ShopPayload.TYPE, ShopPayload.STREAM_CODEC,
                (payload, context) -> com.fixercity.client.ClientPayloads.shop(payload));
    }
}
