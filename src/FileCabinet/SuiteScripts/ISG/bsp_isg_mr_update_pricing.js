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
  "./Lib/bsp_isg_schedule_update_pricing.js",
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
  let isEssendant = false;
  const getInputData = (inputContext) => {
    let functionName = "getInputData";
    let folderId;
    try {
      const scriptObj = runtime.getCurrentScript();
      if (scriptObj.deploymentId === "customdeploy_bsp_isg_esse_updt_prcng") {
        folderId = scriptObj.getParameter({
          name: "custscript_bsp_isg_essendant",
        });
        isEssendant = true;
      } else {
        folderId = scriptObj.getParameter({
          name: "custscript_bsp_isg_sp_richards",
        });
      }
      const fileSearch = search.create({
        type: search.Type.FOLDER,
        columns: [
          {
            join: "file",
            name: "internalid",
          },
        ],
        filters: [
          {
            name: "internalid",
            operator: "anyof",
            values: folderId,
          },
        ],
      });

      let fileId;
      fileSearch.run().each(function (result) {
        fileId = result.getValue({
          join: "file",
          name: "internalid",
        });

        return false;
      });

      const FileObj = file.load({
        id: fileId,
      });
      let pricingToProcess = [];
      if (isEssendant === true) {
        pricingToProcess = BSPUpdatePricing.getEssendantItemPricingObj(FileObj);
      } else {
        pricingToProcess =
          BSPUpdatePricing.getSpRichardsItemPricingObj(FileObj);
      }

      return pricingToProcess;
    } catch (e) {
      log.error(functionName, e.toString());
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
    const scriptObj = runtime.getCurrentScript();
    const vendor = scriptObj.getParameter({
      name: "custscript_bsp_isg_vendor",
    });
    let functionName = "reduceContext";
    try {
      let pricingToUpdateData = reduceContext.values;
      let pricingToUpdateDataObj = JSON.parse(pricingToUpdateData);
      log.debug(
        functionName + " " + "pricingToUpdateData",
        pricingToUpdateDataObj
      );
      const isExisting = BSPUpdatePricing.checkItemId(
        pricingToUpdateDataObj.itemId
      );
      if (isExisting === true) {
        BSPUpdatePricing.updateItemAndContractPlan(
          pricingToUpdateDataObj.itemId,
          pricingToUpdateDataObj.contractCode,
          pricingToUpdateDataObj.purchasePrice,
          pricingToUpdateDataObj.cost,
          vendor
        );
      } else {
      
        BSPUpdatePricing.createItem(
          pricingToUpdateDataObj.itemId,
          pricingToUpdateDataObj.purchasePrice,
          pricingToUpdateDataObj.cost,
          pricingToUpdateDataObj.description
        );
      }
    } catch (e) {
      log.error(functionName, e.toString());
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
  const summarize = (summaryContext) => {};

  return { getInputData, reduce, summarize };
});
