/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message', 'N/url', 'N/record'],
/**
 * @param{message} message
 * @param{url} url
 * @param{record} record
 */
function(message, url, record) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {}

    function transmitPO(purchaseOrderRecID){
        let stLogTitle = "transmitPO";
        try{
            if(validTransmission(purchaseOrderRecID)){
                let msg = message.create({
                    title: "Confirmation",
                    message: "Purchase Order sent for Transmission",
                    type: message.Type.CONFIRMATION
                });     
                msg.show({
                    duration: 10000
                });   
                setTimeout(10000);
    
                let parameters = {
                    purchaseOrderRecID: purchaseOrderRecID
                };
    
                let stSuiteletUrl = url.resolveScript({
                    scriptId: 'customscript_bsp_isg_sl_manual_transm',
                    deploymentId: 'customdeploy_bsp_isg_sl_manual_transm',
                    returnExternalUrl: false,
                });
          
                let suiteletUrl = url.format(stSuiteletUrl, parameters);
                window.ischanged = false;
                window.open(suiteletUrl, '_self');            
                return true;
            }else{
                return false;
            }
        }catch (error) {
            console.log(stLogTitle, JSON.stringify(error));
        }
    }

    function validTransmission(purchaseOrderRecID) {
        var poRec = record.load({
            type: record.Type.PURCHASE_ORDER,
            id: parseInt(purchaseOrderRecID)
        });

        let orderType = poRec.getValue('custbody_bsp_isg_order_type');
        if(orderType == 1 || orderType == 2){
            let itemCount = poRec.getLineCount({
                sublistId: 'item'
            });
            for(let i = 0; i < itemCount; i++){
                let customer = poRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'customer',
                    line: i
                }) 
                if(!customer){
                    alert("Customer information is missing in one of the item lines");
                    return false;
                }
            }
        }
       
        let account = poRec.getValue('custbody_bsp_isg_transmission_acct_num');
        if(!account){
            alert("Please select an Account Number to transmit this PO");
            return false;
        }

        let adot = poRec.getText('custbody_bsp_isg_adot');
        if(!adot){
            alert("Please select an option under the ADOT field to transmit this PO");
            return false;
        }else{
            if(adot == "N"){
                let transmissionLocation = poRec.getValue('custbody_bsp_isg_transmission_loc');
                if(!transmissionLocation){
                    alert("Please select a Transmission location for the selected Trading Partner");
                    return false;
                }
            }
        }

        return true;
    }   

    return {
        pageInit: pageInit,
        transmitPO: transmitPO,
        validTransmission: validTransmission
    };
    
});
