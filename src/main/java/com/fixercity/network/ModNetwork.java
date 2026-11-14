package com.fixercity.network;

import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import net.neoforged.neoforge.network.registration.PayloadRegistrar;

public final class ModNetwork {
    private ModNetwork() {}

    public static void register(RegisterPayloadHandlersEvent event) {
        PayloadRegistrar registrar = event.registrar("1");
        registrar.playToClient(KeyPageSyncPayload.TYPE, KeyPageSyncPayload.STREAM_CODEC, KeyPageSyncPayload::handle);
    }
}
