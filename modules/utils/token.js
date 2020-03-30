import { Sidekick } from "../sidekick.js";
import { SETTING_KEYS, DEFAULT_CONFIG } from "../butler.js";
import { MightySummoner } from "../mighty-summoner.js";

export class TokenUtility {
    /**
     * Hook on token create
     * @param {Object} token 
     * @param {String} sceneId 
     * @param {Object} update 
     * @todo move this to a preCreate hook to avoid a duplicate call to the db
     */
    static _hookOnCreateToken(scene, sceneId, tokenData, options, userId) {
        const token = new Token(tokenData);
        const autoRollHP = Sidekick.getSetting(SETTING_KEYS.tokenUtility.autoRollHP);
        const mightySummoner = Sidekick.getSetting(SETTING_KEYS.mightySummoner.enable);

        if (tokenData.disposition === -1 && autoRollHP && token.actor && !token.actor.isPC) {
            TokenUtility.rollTokenHp(token);
        } else if (mightySummoner) {
            MightySummoner._checkForFeat(token);
        }
    }

    /**
     * Rolls a token's hp formula and returns an update payload with the result
     * @param {*} token
     * @todo refactor to just return the result instead of an update
     */
    static rollTokenHp(token) {
        const formula = token.actor.data.data.attributes.hp.formula;
    
        let r = new Roll(formula);
        r.roll();
        const hp = r.total;
    
        const update = {
            _id: token.id,
            actorData: {
                data: {
                    attributes: {
                        hp: {
                            value: hp,
                            max: hp
                        }
                    }
                }
            }
        };
    
        return update;
    }

    /**
     * Patch the core draw effects so that effects are resizable
     * Errors related to lexical "this" can be ignored due to the fact this method is used as a monkeypatch
     */
    static _patchDrawEffects() {
        let effectSize; 
        
        try {
            effectSize = Sidekick.getSetting(SETTING_KEYS.tokenUtility.effectSize); 
        } catch (e) {
            console.warn(e);
            effectSize = null;
        }


        // Use the default values if no setting found
        const multiplier = effectSize ? DEFAULT_CONFIG.tokenUtility.effectSize[effectSize].multiplier : 2;
        const divisor = effectSize ? DEFAULT_CONFIG.tokenUtility.effectSize[effectSize].divisor : 5;

        this.effects.removeChildren().forEach(c => c.destroy());

        // Draw status effects
        if (this.data.effects.length > 0 ) {

            // Determine the grid sizing for each effect icon
            let w = Math.round(canvas.dimensions.size / 2 / 5) * multiplier;

            // Draw a background Graphics object
            let bg = this.effects.addChild(new PIXI.Graphics()).beginFill(0x000000, 0.40).lineStyle(1.0, 0x000000);

            // Draw each effect icon
            this.data.effects.forEach((src, i) => {
                let tex = PIXI.Texture.from(src, { scale: 1.0 });
                let icon = this.effects.addChild(new PIXI.Sprite(tex));
                icon.width = icon.height = w;
                icon.x = Math.floor(i / divisor) * w;
                icon.y = (i % divisor) * w;
                bg.drawRoundedRect(icon.x + 1, icon.y + 1, w - 2, w - 2, 2);
                this.effects.addChild(icon);
            });
        }

        // Draw overlay effect
        if ( this.data.overlayEffect ) {
            let tex = PIXI.Texture.from(this.data.overlayEffect, { scale: 1.0 });
            let icon = new PIXI.Sprite(tex),
                size = Math.min(this.w * 0.6, this.h * 0.6);
            icon.width = icon.height = size;
            icon.position.set((this.w - size) / 2, (this.h - size) / 2);
            icon.alpha = 0.80;
            this.effects.addChild(icon);
        }
    }
}