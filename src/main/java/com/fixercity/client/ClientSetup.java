package com.fixercity.client;

import com.fixercity.FixerCity;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.model.geom.builders.CubeDeformation;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.renderer.entity.player.PlayerRenderer;
import net.minecraft.client.resources.PlayerSkin;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;

/** 클라이언트 전용 등록: 책장 옷 모델 레이어와 플레이어 렌더 레이어. */
@EventBusSubscriber(modid = FixerCity.MODID, bus = EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
public final class ClientSetup {
    /** 다리/허리 (layer_2 텍스처). 피부 겉옷층(0.25)보다 바깥, 갑옷(0.5)보다 안쪽. */
    public static final ModelLayerLocation OUTFIT_INNER = new ModelLayerLocation(FixerCity.id("key_page_outfit"), "inner");
    /** 상체/팔/신발/모자 (layer_1 텍스처). */
    public static final ModelLayerLocation OUTFIT_OUTER = new ModelLayerLocation(FixerCity.id("key_page_outfit"), "outer");

    private ClientSetup() {}

    @SubscribeEvent
    public static void registerLayerDefinitions(EntityRenderersEvent.RegisterLayerDefinitions event) {
        event.registerLayerDefinition(OUTFIT_INNER,
                () -> LayerDefinition.create(HumanoidModel.createMesh(new CubeDeformation(0.3F), 0.0F), 64, 32));
        event.registerLayerDefinition(OUTFIT_OUTER,
                () -> LayerDefinition.create(HumanoidModel.createMesh(new CubeDeformation(0.4F), 0.0F), 64, 32));
    }

    @SubscribeEvent
    public static void addLayers(EntityRenderersEvent.AddLayers event) {
        for (PlayerSkin.Model skin : event.getSkins()) {
            if (event.getSkin(skin) instanceof PlayerRenderer renderer) {
                renderer.addLayer(new KeyPageOutfitLayer(renderer, event.getEntityModels()));
            }
        }
    }
}
