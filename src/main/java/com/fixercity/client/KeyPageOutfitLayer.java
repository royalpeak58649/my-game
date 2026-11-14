package com.fixercity.client;

import com.fixercity.FixerCity;
import com.fixercity.keypage.KeyPage;
import com.fixercity.keypage.KeyPages;
import com.fixercity.registry.ModAttachments;
import com.mojang.blaze3d.vertex.PoseStack;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.PlayerModel;
import net.minecraft.client.model.geom.EntityModelSet;
import net.minecraft.client.player.AbstractClientPlayer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.resources.ResourceLocation;

/** 책장을 낀 플레이어에게 그 책장의 옷을 입혀 그린다. 갑옷은 이 위에 덧그려진다. */
public class KeyPageOutfitLayer extends RenderLayer<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> {
    private final HumanoidModel<AbstractClientPlayer> inner;
    private final HumanoidModel<AbstractClientPlayer> outer;

    public KeyPageOutfitLayer(RenderLayerParent<AbstractClientPlayer, PlayerModel<AbstractClientPlayer>> parent, EntityModelSet models) {
        super(parent);
        this.inner = new HumanoidModel<>(models.bakeLayer(ClientSetup.OUTFIT_INNER));
        this.outer = new HumanoidModel<>(models.bakeLayer(ClientSetup.OUTFIT_OUTER));
    }

    @Override
    public void render(PoseStack poseStack, MultiBufferSource buffer, int packedLight, AbstractClientPlayer player,
            float limbSwing, float limbSwingAmount, float partialTick, float ageInTicks, float netHeadYaw, float headPitch) {
        if (player.isInvisible()) {
            return;
        }
        KeyPage page = KeyPages.byId(player.getData(ModAttachments.KEY_PAGE));
        if (page == null) {
            return;
        }

        getParentModel().copyPropertiesTo(outer);
        outer.setAllVisible(false);
        outer.head.visible = page.hat();
        outer.body.visible = true;
        outer.rightArm.visible = true;
        outer.leftArm.visible = true;
        outer.rightLeg.visible = true;
        outer.leftLeg.visible = true;
        renderPart(outer, poseStack, buffer, packedLight, texture(page, 1));

        getParentModel().copyPropertiesTo(inner);
        inner.setAllVisible(false);
        inner.body.visible = true;
        inner.rightLeg.visible = true;
        inner.leftLeg.visible = true;
        renderPart(inner, poseStack, buffer, packedLight, texture(page, 2));
    }

    private static void renderPart(HumanoidModel<AbstractClientPlayer> model, PoseStack poseStack, MultiBufferSource buffer,
            int packedLight, ResourceLocation texture) {
        model.renderToBuffer(poseStack, buffer.getBuffer(RenderType.armorCutoutNoCull(texture)), packedLight,
                OverlayTexture.NO_OVERLAY, -1);
    }

    private static ResourceLocation texture(KeyPage page, int layer) {
        return FixerCity.id("textures/models/outfit/" + page.id() + "_layer_" + layer + ".png");
    }
}
