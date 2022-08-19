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
            type: "customrecord_bsp_edi_settings",
            filters:
            [
               ["custrecord_bsp_edi_environment","is",environment],
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:
            [
               search.createColumn({
                  name: "name",
                  join: "CUSTRECORD_BSP_EDI_ORGANIZATION",
                  label: "Name"
               }),
               search.createColumn({
                  name: "custrecord_bsp_as2_org_identifier",
                  join: "CUSTRECORD_BSP_EDI_ORGANIZATION",
                  label: "AS2 Identifier"
               })
            ]
        });

        EDISettingsSearchObj.run().each(function(result){
            let name = result.getValue({name: "name", join: "CUSTRECORD_BSP_EDI_ORGANIZATION"});
            let as2Identifier = result.getValue({name: "custrecord_bsp_as2_org_identifier", join: "CUSTRECORD_BSP_EDI_ORGANIZATION"});
            ediSettingsFields = {
                name: name,
                as2Identifier: as2Identifier
            }
            return true;
         });
        return ediSettingsFields;
    }

    return {
        getEDIsettings:getEDIsettings
	};
});
