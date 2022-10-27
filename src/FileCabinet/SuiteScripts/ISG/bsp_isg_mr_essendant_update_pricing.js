/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
  "N/error",
  "N/file",
  "N/record",
  "N/search",
  "N/runtime",
  "./Lib/bsp_isg_update_pricing.js",
], (error, file, record, search, runtime, BSPUpdatePricing) => {
  /**
   * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
   * @param {Object} inputContext
   * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Object} inputContext.ObjectRef - Object that references the input data
   * @typedef {Object} ObjectRef
   * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
   * @property {string} ObjectRef.type - Type of the record instance that contains the input data
   * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
   * @since 2015.2
   */
  const getInputData = (inputContext) => {
    let functionName = "getInputData";
    let errorMessage = "";
    log.audit(functionName, "************ EXECUTION STARTED ************");
    try {
      const params = getParameters();
      log.debug("paramsObj: ", params);
      const fileObj = file.load({
        id: parseInt(params.fileId),
      });

      if (!params.accountNumberId) {
        errorMessage = "Cannot Process the file. Account Number does not exist";
        throw errorMessage;
      }
      let pricingToProcess;
      //process csv file for essendant
      pricingToProcess = BSPUpdatePricing.getEssendantItemPricingObj(
        fileObj,
        params.accountNumberId
      );

      return pricingToProcess;
    } catch (e) {
      log.error(functionName, errorMessage ? errorMessage : e.message);
    }
  };
  /**
   * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
   * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
   * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
   *     provided automatically based on the results of the map stage.
   * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
   *     reduce function on the current group
   * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
   * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {string} reduceContext.key - Key to be processed during the reduce stage
   * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
   *     for processing
   * @since 2015.2
   */
  const reduce = (reduceContext) => {
    let functionName = "reduceContext";
    try {
      const params = getParameters();
      let itemPricingData = JSON.parse(reduceContext.values);
      const vendor = params.vendor;
      const itemId = BSPUpdatePricing.checkItemId(itemPricingData.itemId);
     
      if (itemId) {
        const itemContractPlanId = BSPUpdatePricing.createItemAccountPlans(
          itemId,
          itemPricingData,
          vendor
        );
        log.debug(
          functionName,
          `Item: ${itemId} already exist | created account contraplan ID: ${itemContractPlanId} `
        );
      } else {
        const newItemId = BSPUpdatePricing.createItem(itemPricingData, vendor);
        log.audit(functionName, "item id created: " + newItemId);
        if (newItemId) {
          const itemContractPlanId = BSPUpdatePricing.createItemAccountPlans(
            newItemId,
            itemPricingData,
            vendor
          );
	        log.debug(functionName, `Created Item ID: ${newItemId} and account contraplan ID: ${itemContractPlanId} `);
        }
      }
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  /**
   * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
   * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
   * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
   * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
   *     script
   * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
   * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
   * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
   * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
   *     script
   * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
   * @param {Object} summaryContext.inputSummary - Statistics about the input stage
   * @param {Object} summaryContext.mapSummary - Statistics about the map stage
   * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
   * @since 2015.2
   */
  const summarize = (summaryContext) => {
    const functionName = "Summarize";
    try {
      const params = getParameters();

      let folderId;
      let doneFolderId;

      folderId = params.pendingFolderId;
      doneFolderId = params.doneFolderId;
      log.debug(functionName + " FolderId's: ", { folderId, doneFolderId });
      // BSPUpdatePricing.moveFolderToDone(
      //   BSPUpdatePricing.getFileId(folderId),
      //   doneFolderId
      // );

      log.audit(functionName, {
        UsageConsumed: summaryContext.usage,
        NumberOfQueues: summaryContext.concurrency,
        NumberOfYields: summaryContext.yields,
      });
      log.debug(functionName, "************ EXECUTION COMPLETED ************");
    } catch (e) {
      log.error(functionName, e.message);
    }
  };
  const getParameters = () => {
    let objParams = {};

    let objScript = runtime.getCurrentScript();
    objParams = {
      doneFolderId: objScript.getParameter({
        name: "custscript_bsp_isg_essen_done_folder_id",
      }),
      accountNumberId: objScript.getParameter({
        name: "custscript_bsp_isg_acc_num",
      }),
      fileId: objScript.getParameter({ name: "custscript_bsp_isg_file_id" }),
      tradingPartnerId: objScript.getParameter({
        name: "custscript_bsp_isg_up_trading_partner",
      }),
      vendor: objScript.getParameter({ name: "custscript_bsp_isg_vendor" }),
    };

    return objParams;
  };
  return { getInputData, reduce, summarize };
});
