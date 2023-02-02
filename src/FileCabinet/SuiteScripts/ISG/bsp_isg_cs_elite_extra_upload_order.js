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
], function (search, record, dialog, message, BSPExliteExtra) {

  function pageInit(scriptContext) {

  }

  /**
   * check if tracking number is existing to prompt user for confirmation to re-upload order details if it is existing
   *@param recId
   *@param {*}eliteExtraId
   */
  function validateTrackingInformation(recId, eliteExtraId) {

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
          const response = BSPExliteExtra.sendOrderDetails(recId, eliteExtraId);
          const eliteExtraSettings = BSPExliteExtra.getEliteExtraSettings(eliteExtraId);
          const returnMessage = updateRecordTrackingInfo(response, recId, eliteExtraSettings.trackingLink)
          showResponseToUser(returnMessage);
          setTimeout(function () {
            location.reload();
          }, 3000)

        }
      }

      dialog.confirm(options).then(success);
    } else {
      alert("Uploading Order Please wait...");
      const response = BSPExliteExtra.sendOrderDetails(recId, eliteExtraId);
      const eliteExtraSettings = BSPExliteExtra.getEliteExtraSettings(eliteExtraId);
      const returnMessage = updateRecordTrackingInfo(response, recId, eliteExtraSettings.trackingLink)
      showResponseToUser(returnMessage);
      setTimeout(function () {
        location.reload();
      }, 3000)

    }
  }

  /**
   * Show response to the user if the was successfully uploaded or not
   * @param {*} response
   */
  function showResponseToUser(response) {
    if (response[0].failed == false) {
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
   * @param id
   * @param {*} trackingLink
   */
  function updateRecordTrackingInfo(res, id, trackingLink) {
    const response = res.body;
    const resString = [response];
    const resBody = JSON.parse(resString[0]);
    let message = [];
    if (res.code === 200 && !isEmpty(resBody.tracking)) {
      const updatedId = record.submitFields({
        type: record.Type.ITEM_FULFILLMENT,
        id: id,
        values: {
          custbody_bsp_isg_tracking_number: resBody.tracking,
          custbody_bsp_isg_tracking_link: trackingLink + resBody.tracking,
        },
      });
      log.debug("Rec Id: " + updatedId + " Updated", [
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

  function isEmpty(stValue) {
    return (
        stValue === "" ||
        stValue == null ||
        stValue == undefined ||
        (stValue.constructor === Array && stValue.length == 0) ||
        (stValue.constructor === Object &&
            (function (v) {
              for (var k in v) return false;
              return true;
            })(stValue))
    );
  }

  return {
    pageInit: pageInit,
    validateTrackingInformation: validateTrackingInformation,
  };
});
