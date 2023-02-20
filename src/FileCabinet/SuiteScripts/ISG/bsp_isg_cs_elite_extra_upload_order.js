/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    "N/currentRecord",
    "N/search",
    "N/record",
    "N/ui/dialog",
    "N/ui/message",
    "./Lib/bsp_isg_elite_extra_create_order.js",
], function (currentRecord, search, record, dialog, message, BSPExliteExtra) {

    function pageInit(scriptContext) {

    }

    /**
     * check if tracking number is existing to prompt user for confirmation to re-upload order details if it is existing
     *@param recId
     *@param {*}eliteExtraId
     */
    function validateTrackingInformation(recId, eliteExtraId) {
        try {
                console.log(recId + recId)
            let curRec = currentRecord.get()
            const type = curRec.type
            let trackingNumberSearch = search.lookupFields({
                type: record.Type.ITEM_FULFILLMENT,
                id: recId,
                columns: ["custbody_bsp_isg_tracking_number"],
            });

            if (
                !BSPExliteExtra.isEmpty(trackingNumberSearch.custbody_bsp_isg_tracking_number)
            ) {
                let options = {
                    title: "Order already uploaded. Do you want to re-upload it?",
                    message: "Press OK or Cancel",
                };

                function success(result) {
                    if (result === true) {
                        alert("Uploading Order Please wait...");

                        const response = BSPExliteExtra.sendOrderDetails({
                            recId: recId,
                            eliteExtraId: eliteExtraId,
                            recType: type
                        });
                        const eliteExtraSettings = BSPExliteExtra.getEliteExtraSettings(eliteExtraId);

                        const returnMessage = BSPExliteExtra.updateRecordTrackingInfo({
                            response: response,
                            id: recId,
                            trackingLink: eliteExtraSettings.trackingLink,
                            recType: type
                        });
                        showResponseToUser(returnMessage);
                        setTimeout(function () {
                            location.reload();
                        }, 3000)

                    }
                }

                dialog.confirm(options).then(success);
            } else {
                console.log("else")
                alert("Uploading Order Please wait...");
                const response = BSPExliteExtra.sendOrderDetails({
                    recId: recId,
                    eliteExtraId: eliteExtraId,
                    recType: type
                });
                const eliteExtraSettings = BSPExliteExtra.getEliteExtraSettings(eliteExtraId);
                const returnMessage = BSPExliteExtra.updateRecordTrackingInfo({
                    response: response,
                    id: recId,
                    trackingLink: eliteExtraSettings.trackingLink,
                    recType: type
                });
                showResponseToUser(returnMessage);
                setTimeout(function () {
                    location.reload();
                }, 3000)

            }
        } catch (e) {
            console.log("validateTrackingInformation", e.message)
        }
    }

    /**
     * Show response to the user if the was successfully uploaded or not
     * @param {*} response
     */
    function showResponseToUser(response) {
        if (response[0].failed === false) {
            const infoMessage = message.create({
                title: "CONFIRMATION",
                message: response[0].message,
                type: message.Type.CONFIRMATION,
            });
            infoMessage.show();
        } else {
            const infoMessage = message.create({
                title: "FAILED",
                message: response[0].message,
                type: message.Type.ERROR,
            });
            infoMessage.show();

        }
    }


    return {
        pageInit: pageInit,
        validateTrackingInformation: validateTrackingInformation,
    };
});
