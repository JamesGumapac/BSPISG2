/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search'], function (search) {
    
    /**
     * Returns integration settings Rec according to environment
     * @param {*} environment 
     * @returns 
     */
    function getSettingsID(environment){
        let settingsRecID = null;
        const lbIntegrationSettingsSearchObj = search.create({
            type: "customrecord_bsp_isg_lb_integ_settings",
            filters:
            [
               ["custrecord_bsp_lb_environment","is",environment], 
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:[]
        });

        lbIntegrationSettingsSearchObj.run().each(function(result){
            settingsRecID = result.id;
            return true;
        });
        return settingsRecID;
    }

    return {
        getSettingsID:getSettingsID
	};
});
