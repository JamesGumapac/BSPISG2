/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './bsp_isg_spr.js', './bsp_isg_essendant.js'], function (search, record, SPR, ESSENDANT) {

    const CONTANTS = Object.freeze({
        essendant : "Essendant Inc",
        spr : "SPR"
    });

    /**
     * Returns Trading Partner Constants
     * @returns 
    */
    function constants(){
        return CONTANTS;
    }

    /**
     * If the vendor is a trading partner, return true. Otherwise, return false.
     * @param vendor - The vendor ID of the vendor you want to check.
     * @returns A boolean value.
    */
    function isTradingPartner(vendor){
        const trading_partnerSearchObj = search.create({
            type: "customrecord_bsp_isg_trading_partner",
            filters:
            [
               ["custrecord_bsp_isg_tp_vendor","anyof",vendor], 
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:[]
        });
        var searchResultCount = trading_partnerSearchObj.runPaged().count;
        return (searchResultCount > 0);
    }

    /**
     * It takes a vendor ID and returns the trading partner ID.
     * @param vendor - The vendor ID of the vendor that you want to get the trading partner ID for.
     * @returns The ID of the trading partner record.
    */
    function getTradingPartnerID(vendor){
        let tradingPartnerID = null;
        log.debug("getTradingPartnerID", "Vendor: " + vendor);

        const trading_partnerSearchObj = search.create({
            type: "customrecord_bsp_isg_trading_partner",
            filters:
            [
               ["custrecord_bsp_isg_tp_vendor","anyof",vendor], 
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:[]
         });

         trading_partnerSearchObj.run().each(function(result){
            tradingPartnerID = result.id;
            return true;
         });

		return tradingPartnerID;
    }

    /**
     * It takes a trading partner ID and returns the BOD ID associated with that trading partner.
     * @param id - The internal ID of the record you want to look up.
     * @returns the value of the field "custrecord_bsp_trading_partner_bodid" from the record
     * "customrecord_bsp_lb_trading_partner"
    */
    function getTradingPartnerBODId(id){
        let bodID = null;
        let objTradingPartnerField = search.lookupFields({
            type: "customrecord_bsp_isg_trading_partner",
            id: parseInt(id),
            columns: 'custrecord_bsp_trading_partner_bodid'
        });

        if(objTradingPartnerField && objTradingPartnerField.custrecord_bsp_trading_partner_bodid){
            bodID = objTradingPartnerField.custrecord_bsp_trading_partner_bodid;
        }
        return bodID;
    }   

    /**
     * It takes a vendor ID and returns the trading partner Delivery Time.
     * @param vendor - The vendor ID of the vendor that you want to get the trading partner Delivery Time for.
     * @returns The tradingPartnerDeliveryTime.
    */
    function getTradingPartnerDeliveryTime(vendor){
        let tradingPartnerDeliveryTime = null;

        const trading_partnerSearchObj = search.create({
            type: "customrecord_bsp_isg_trading_partner",
            filters:
            [
                ["custrecord_bsp_isg_tp_vendor","anyof",vendor], 
                "AND", 
                ["isinactive","is","F"]
            ],
            columns:[
                search.createColumn({name: "custrecord_bsp_isg_delivery_time", label: "Delivery Time"})
            ]
            });

            trading_partnerSearchObj.run().each(function(result){
                tradingPartnerDeliveryTime = result.getValue("custrecord_bsp_isg_delivery_time");
                return true;
            });

        return tradingPartnerDeliveryTime;
    }


    /**
     * It searches for a trading partner that has a vendor field that matches the vendor passed in and
     * returns the value of the "Auto Determine Best Price" field.
     * @param vendor - The vendor that the item is being purchased from.
     * @returns A boolean value.
     */
    function getAutoDetermineBestPriceConfig(vendor){
        let autoDetermineBestPriceConfig = false;

        const trading_partnerSearchObj = search.create({
            type: "customrecord_bsp_isg_trading_partner",
            filters:
            [
                ["custrecord_bsp_isg_tp_vendor","anyof",vendor], 
                "AND", 
                ["isinactive","is","F"]
            ],
            columns:[
                search.createColumn({name: "custrecord_bsp_isg_determine_best_price", label: "Auto Determine Best Price"})
            ]
        });

        trading_partnerSearchObj.run().each(function(result){
            autoDetermineBestPriceConfig = result.getValue("custrecord_bsp_isg_determine_best_price");
            return true;
        });

        return autoDetermineBestPriceConfig;
    }

    /**
     * It takes a vendor ID and returns the trading partner Main Account for either W&L or DropShip.
     * @param vendor - The vendor ID of the vendor.
     * @param accountType - The Account Type to be sourced.
     * @returns The ID of the Main Account.
    */
    function getMainAccount(vendor, accountType){
        let mainAccount = null;

        const trading_partnerSearchObj = search.create({
            type: "customrecord_bsp_isg_trading_partner",
            filters:
            [
                ["custrecord_bsp_isg_tp_vendor","anyof",vendor], 
                "AND", 
                ["isinactive","is","F"]
            ],
            columns:[
                search.createColumn({name: "custrecord_bsp_isg_main_wl_account", label: "Main Wrap and Label Account"}),
                search.createColumn({name: "custrecord_bsp_isg_main_dropship_account", label: "Main DropShip Account"})
            ]
            });

            trading_partnerSearchObj.run().each(function(result){
                if(accountType == "DropShip"){
                    mainAccount = result.getValue("custrecord_bsp_isg_main_dropship_account");
                }else if(accountType == "Wrap and Label"){
                    mainAccount = result.getValue("custrecord_bsp_isg_main_wl_account");
                }
                return true;
            });

        return mainAccount;
    }

    /**
     * This function takes a vendor ID and returns an object containing the trading partner settings for
     * that vendor.
     * @param vendor - The vendor ID of the vendor you want to get the trading partner info for.
     * @returns the tradingPartnerData object.
    */
    function getTradingPartnerInfo(vendor){
        let tradingPartnerData = null;

        const tradingPartnerSearchObj = search.create({
            type: "customrecord_bsp_isg_trading_partner",
            filters:
            [
               ["custrecord_bsp_isg_tp_vendor","anyof",vendor], 
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:
            [
               search.createColumn({name: "internalid", label: "Internal ID"}),
               search.createColumn({
                  name: "name",
                  sort: search.Sort.ASC,
                  label: "Name"
               }),
               search.createColumn({name: "custrecord_bsp_lb_as2_id", label: "AS2 Identifier"}),
               search.createColumn({name: "custrecord_bsp_compress_msg", label: "Compress Message"}),
               search.createColumn({name: "custrecord_bsp_encrypt_msg", label: "Encrypt Message"}),
               search.createColumn({name: "custrecord_bsp_encryption_algorithm", label: "Encryption Algorithm"}),
               search.createColumn({name: "custrecord_bsp_mdn_to", label: "MDN to"}),
               search.createColumn({name: "custrecord_bsp_sign_msg", label: "Sign Message"}),
               search.createColumn({name: "custrecord_bsp_signature_algorith", label: "Signature Algorithm"}),
               search.createColumn({name: "custrecord_bsp_lb_target_url", label: "Target URL"}),
               search.createColumn({name: "custrecord_bsp_template_xml_file", label: "Template XML file"}),
               search.createColumn({name: "custrecord_bsp_trading_partner_act_code", label: "Action Code"}),
               search.createColumn({name: "custrecord_bsp_edi_organization", label: "Organization AS2 Identifier"}),
               search.createColumn({name: "custrecord_bsp_transm_output_folder_id", label: "Transmission Output folder"})
            ]
        });

        tradingPartnerSearchObj.run().each(function(result){
            let id = result.getValue({name: "internalid"});
            let name = result.getValue({name: "name"});
            let as2Identifier = result.getValue({name: "custrecord_bsp_lb_as2_id"});
            let compressMessage = result.getValue({name: "custrecord_bsp_compress_msg"});
            let encryptMessage = result.getValue({name: "custrecord_bsp_encrypt_msg"});
            let encryptionAlgorithm = result.getValue({name: "custrecord_bsp_encryption_algorithm"});
            let mdnTo = result.getValue({name: "custrecord_bsp_mdn_to"});
            let signMessage = result.getValue({name: "custrecord_bsp_sign_msg"});
            let signatureAlgorithm = result.getValue({name: "custrecord_bsp_signature_algorith"});
            let targetURL = result.getValue({name: "custrecord_bsp_lb_target_url"});
            let xmlTemplateFileID = result.getValue({name: "custrecord_bsp_template_xml_file"});
            let transmissionOutputFolderID = result.getValue({name: "custrecord_bsp_transm_output_folder_id"});
            let actionCode = result.getValue({name: "custrecord_bsp_trading_partner_act_code"});
            let orgAS2Identifier = result.getValue({name: "custrecord_bsp_edi_organization"});

            tradingPartnerData = {
                id: id,
                name: name,
                orgAS2Identifier: orgAS2Identifier,
                as2Identifier: as2Identifier,
                compressMessage: compressMessage,
                encryptMessage: encryptMessage,
                encryptionAlgorithm: encryptionAlgorithm,
                mdnTo: mdnTo,
                signMessage: signMessage,
                signatureAlgorithm: signatureAlgorithm,
                targetURL: targetURL,
                xmlTemplateFileID: xmlTemplateFileID,
                transmissionOutputFolderID: transmissionOutputFolderID,
                actionCode: actionCode
            }
            return true;
        });

        return tradingPartnerData;
    }
    
    /**
     * "If the trading partner is essendant, then call the essendant processPOAck function, otherwise if
     * the trading partner is spr, then call the spr processPOAck function."
     * 
     * @param jsonObjResponse - This is the JSON object that is returned from the server.
     * @param tradingPartner - This is the trading partner that the PO Ack is coming from.
    */
    function processPOAck(jsonObjResponse, tradingPartner){
        let result = {};
        if(tradingPartner == CONTANTS.essendant){
            result = ESSENDANT.processPOAck(jsonObjResponse);
        }
        if(tradingPartner == CONTANTS.spr){
            result = SPR.processPOAck(jsonObjResponse);
        }
        return result;
    }

    /**
     * "If the trading partner is essendant, then call the essendant processInvoice function, otherwise if
     * the trading partner is spr, then call the spr processInvoice function."
     * 
     * @param jsonObjResponse - This is the JSON object that is returned from the server.
     * @param tradingPartner - This is the trading partner that the PO Ack is coming from.
    */    
    function processInvoice(jsonObjResponse, tradingPartner){
        let result = {};
        if(tradingPartner == CONTANTS.essendant){
            result = ESSENDANT.processInvoice(jsonObjResponse);
        }
        if(tradingPartner == CONTANTS.spr){
            result = SPR.processInvoice(jsonObjResponse);
        }

        return result;
    }

    /**
     * "If the trading partner is essendant, then call the essendant processASN function, otherwise if
     * the trading partner is spr, then call the spr processASN function."
     * 
     * @param jsonObjResponse - This is the JSON object that is returned from the server.
     * @param tradingPartner - This is the trading partner that the PO Ack is coming from.
    */    
    function processASN(jsonObjResponse, tradingPartner){
        let result = {};
        if(tradingPartner == CONTANTS.essendant){
            result = ESSENDANT.processASN(jsonObjResponse);
        }
        if(tradingPartner == CONTANTS.spr){
            result = SPR.processASN(jsonObjResponse);
        }

        return result;
    }

    return {
        constants: constants,
        getTradingPartnerID: getTradingPartnerID,
        getTradingPartnerInfo: getTradingPartnerInfo,
        getTradingPartnerBODId: getTradingPartnerBODId,
        isTradingPartner: isTradingPartner,
        getTradingPartnerDeliveryTime: getTradingPartnerDeliveryTime,
        getMainAccount: getMainAccount,
        getAutoDetermineBestPriceConfig: getAutoDetermineBestPriceConfig,
        processPOAck: processPOAck,
        processInvoice: processInvoice,
        processASN: processASN
	};
});