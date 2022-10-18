/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search'], function (search) {
    
   /**
     * It searches for the EDI settings corresponding to the account current environment, and returns the values of
     * two fields: Name and AS2 Identifier.
     * @param environment - The environment that the EDI settings are for.
     * @returns the value of the variable ediSettingsFields.
   */
   function getEDIsettings(environment){
        let ediSettingsFields = null;
        const EDISettingsSearchObj = search.create({
            type: "customrecord_bsp_isg_edi_settings",
            filters:
            [
               ["custrecord_bsp_edi_environment","is",environment],
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:
            [
               search.createColumn({
                  name: "custrecord_bsp_sb_endpoint_url",
                  label: "Endpoint URL"
               }),
               search.createColumn({
                  name: "custrecord_bsp_sb_user",
                  label: "User"
               }),
               search.createColumn({
                  name: "custrecord_bsp_sb_password",
                  label: "Password"
               }),
               search.createColumn({
                  name: "custrecord_bsp_po_form",
                  label: "Purchase Order Form"
               })
            ]
        });

        EDISettingsSearchObj.run().each(function(result){
            let endpointURL = result.getValue("custrecord_bsp_sb_endpoint_url");
            let user = result.getValue("custrecord_bsp_sb_user");
            let pwd = result.getValue("custrecord_bsp_sb_password");
            let transactionForm = result.getValue("custrecord_bsp_po_form");
            ediSettingsFields = {
                endpointURL: endpointURL,
                user: user,
                pwd: pwd,
                transactionForm: transactionForm
            }
            return true;
         });
        return ediSettingsFields;
   }


   function getCartonBuyFields(environment){
      let cartonBuyFields = {};
      const EDISettingsSearchObj = search.create({
            type: "customrecord_bsp_isg_edi_settings",
            filters:
            [
               ["custrecord_bsp_edi_environment","is",environment],
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:
            [
               search.createColumn({
                  name: "custrecord_bsp_isg_min_quantity_range",
                  label: "Close to Minimum Quantity Percetage"
               })           
            ]
      });

      EDISettingsSearchObj.run().each(function(result){
            let minQuantityPercentage = result.getValue("custrecord_bsp_isg_min_quantity_range");   
            cartonBuyFields.minQuantityPercentage = minQuantityPercentage;
            return true;
      });
      return cartonBuyFields;
   }

    return {
        getEDIsettings:getEDIsettings,
        getCartonBuyFields: getCartonBuyFields
	};
});
