/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/search",
  "N/record",
  "N/ui/dialog",
  "N/ui/message",
  "./Lib/bsp_isg_elite_extra_create_order.js",
], function (search, record,dialog, message, BSPExliteExtra) {
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

  /**
   * check if tracking number is existing to prompt user for confirmation to re-upload order details if it is existing
   *@param {*}eliteExtraId
   *@param {*} ifId
   */
  function validateTrackingInformation(ifId, eliteExtraId) {
    const trackingNumberSearch = search.lookupFields({
      type: "itemfulfillment",
      id: ifId,
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
          const response = BSPExliteExtra.sendOrderDetails(ifId, eliteExtraId);
          const eliteExtraSettings = BSPExliteExtra.getEliteExtraSettings(eliteExtraId);
          const returnMessage = updateIF(response, ifId,eliteExtraSettings.trackingLink)
          showResponseToUser(returnMessage);
          location.reload();
        
        }
      }
      dialog.confirm(options).then(success);
    } else {
      alert("Uploading Order Please wait...");
      const response = BSPExliteExtra.sendOrderDetails(ifId, eliteExtraId);
      const eliteExtraSettings = BSPExliteExtra.getEliteExtraSettings(eliteExtraId);
      const returnMessage = updateIF(response, ifId,eliteExtraSettings.trackingLink)
      showResponseToUser(returnMessage);
      location.reload();

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
  /**
   * Update IF tracking information
   * @param {*} res
   * @param {*} ifId
   * @param {*} trackingLink
   */
  
  function updateIF(res, ifId,trackingLink) {
    const response = res.body;
    const resString = [response];
    const resBody = JSON.parse(resString[0]);
    let message = [];
    if (res.code === 200 && !BSPExliteExtra.isEmpty(resBody.tracking)) {
      const ifUpdateId = record.submitFields({
        type: record.Type.ITEM_FULFILLMENT,
        id: ifId,
        values: {
          custbody_bsp_isg_tracking_number: resBody.tracking,
          custbody_bsp_isg_tracking_link: trackingLink + resBody.tracking,
        },
      });
      log.debug("IF ID: " + ifUpdateId + " Updated", [
        resBody.tracking,
        resBody.filename,
      ]);
      message.push({
        message: "Order has been uploaded successfully.",
        failed: false,
      });
    } else {
      message.push({
        message: "Failed to create order",
        failed: true,
      });
    }
    log.debug("message", message);
    return message;
  }

  return {
    pageInit: pageInit,
    validateTrackingInformation: validateTrackingInformation,
  };
});
