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
     * This function takes a vendor ID and returns an object containing the trading partner settings for
     * that vendor.
     * @param vendor - The vendor ID of the vendor you want to get the trading partner info for.
     * @returns the tradingPartnerData object.
    */
    function getTradingPartnerInfo(vendor){
        let tradingPartnerData = null;
        const tradingPartnerSearchObj = search.create({
            type: "vendor",
            filters:
            [
                ["internalid","anyof",vendor], 
                "AND", 
                ["isinactive","is","F"]
            ],
            columns:
            [
                search.createColumn({
                    name: "internalid",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Internal ID"
                }),
                search.createColumn({
                    name: "name",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Name"
                }),
                search.createColumn({
                    name: "custrecord_bsp_lb_as2_id",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "AS2 Identifier"
                }),
                search.createColumn({
                    name: "custrecord_bsp_compress_msg",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Compress Message"
                }),
                search.createColumn({
                    name: "custrecord_bsp_encrypt_msg",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Encrypt Message"
                }),
                search.createColumn({
                    name: "custrecord_bsp_encryption_algorithm",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Encryption Algorithm"
                }),
                search.createColumn({
                    name: "custrecord_bsp_mdn_to",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "MDN to"
                }),
                search.createColumn({
                    name: "custrecord_bsp_sign_msg",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Sign Message"
                }),
                search.createColumn({
                    name: "custrecord_bsp_signature_algorith",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Signature Algorithm"
                }),
                search.createColumn({
                    name: "custrecord_bsp_lb_target_url",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Target URL"
                }),
                search.createColumn({
                    name: "custrecord_bsp_template_xml_file",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Template XML file"
                }),
                search.createColumn({
                    name: "custrecord_bsp_transm_output_folder_id",
                    join: "custentity_bsp_isg_trading_part_settings",
                    label: "Template XML file"
                }),
                search.createColumn({
                name: "custrecord_bsp_trading_partner_act_code",
                join: "custentity_bsp_isg_trading_part_settings",
                label: "Action Code"
                })
            ]
        });
        tradingPartnerSearchObj.run().each(function(result){
            let id = result.getValue({name: "internalid", join: "custentity_bsp_isg_trading_part_settings"});
            let name = result.getValue({name: "name", join: "custentity_bsp_isg_trading_part_settings"});
            let as2Identifier = result.getValue({name: "custrecord_bsp_lb_as2_id", join: "custentity_bsp_isg_trading_part_settings"});
            let compressMessage = result.getValue({name: "custrecord_bsp_compress_msg", join: "custentity_bsp_isg_trading_part_settings"});
            let encryptMessage = result.getValue({name: "custrecord_bsp_encrypt_msg", join: "custentity_bsp_isg_trading_part_settings"});
            let encryptionAlgorithm = result.getValue({name: "custrecord_bsp_encryption_algorithm", join: "custentity_bsp_isg_trading_part_settings"});
            let mdnTo = result.getValue({name: "custrecord_bsp_mdn_to", join: "custentity_bsp_isg_trading_part_settings"});
            let signMessage = result.getValue({name: "custrecord_bsp_sign_msg", join: "custentity_bsp_isg_trading_part_settings"});
            let signatureAlgorithm = result.getValue({name: "custrecord_bsp_signature_algorith", join: "custentity_bsp_isg_trading_part_settings"});
            let targetURL = result.getValue({name: "custrecord_bsp_lb_target_url", join: "custentity_bsp_isg_trading_part_settings"});
            let xmlTemplateFileID = result.getValue({name: "custrecord_bsp_template_xml_file", join: "custentity_bsp_isg_trading_part_settings"});
            let transmissionOutputFolderID = result.getValue({name: "custrecord_bsp_transm_output_folder_id", join: "custentity_bsp_isg_trading_part_settings"});
            let actionCode = result.getValue({name: "custrecord_bsp_trading_partner_act_code", join: "custentity_bsp_isg_trading_part_settings"});
            
            tradingPartnerData = {
                id: id,
                name: name,
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
     * It takes a record ID and a document control number, increments the document control number by 1, and
     * then updates the record with the new document control number.
     * @param id - the internal id of the record you want to update
     * @param documentControlNumber - The document control number that is being used to generate the BOD
     * ID.
    */
    function updateTradingPartnerBODId(id, documentControlNumber){
        let bodID =  parseInt(documentControlNumber);
        let newBODid = bodID + 1;
        newBODid = ((newBODid == 100000) ? 1 : newBODid);

        let newBODidString = String(newBODid).padStart(5, '0'); 

        record.submitFields({
            type: "customrecord_bsp_isg_trading_partner",
            id: parseInt(id),
            values: {
                custrecord_bsp_trading_partner_bodid: newBODidString
            }
        });
    }

    /**
     * It returns true if the trading partner name is equal to the constant value "spr".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isAcknowledgmentSPR(jsonObjResponse){
        let order = jsonObjResponse.Order;
        if(order){
            let tradingPartnerName = order.EnterpriseCode;
            if(!isEmpty(tradingPartnerName)){
                return tradingPartnerName == CONTANTS.spr;
            }
        }
        return false;
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
     * Check for Empty value
     * @param {*} value 
     * @returns 
    */
	function isEmpty(value) {
		return (
			value === "" ||
			value == null ||
			value == undefined ||
			value == "null" ||
			value == "undefined" ||
			(value.constructor === Array && value.length == 0) ||
			(value.constructor === Object &&
				(function (v) {
					for (let k in v) return false;
					return true;
				})(value))
		);
	}

    return {
        constants: constants,
        getTradingPartnerInfo: getTradingPartnerInfo,
        getTradingPartnerBODId: getTradingPartnerBODId,
        updateTradingPartnerBODId: updateTradingPartnerBODId,
        isAcknowledgmentSPR: isAcknowledgmentSPR,
        processPOAck: processPOAck
	};
});