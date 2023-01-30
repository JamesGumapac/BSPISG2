/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/**
 * Author: Business Solutions Partner
 * Date: 01/27/2023
 * Update: Include Bid Price in the results. Date:01/30/2023.
 */

define([
  "N/http",
  "N/ui/serverWidget",
  "N/cache",
  "./Lib/bsp_isg_get_item_rebates.js",
], /**
 * @param http
 * @param{serverWidget} serverWidget
 * @param cache
 * @param util
 */ (http, serverWidget, cache, util) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (scriptContext) => {
    let functionName = "onRequest";
    try {
      let objClientParams = scriptContext.request.parameters;
      if (scriptContext.request.method === http.Method.GET) {
        let params = {
          vendorSelected: objClientParams.custparam_vendorSelected,
          rebateContractSelected: objClientParams.custparam_rebateContract,
          dateFilter: objClientParams.custparam_dateFilter,
        };
        let form = displayForm(params);
        scriptContext.response.writePage(form);
      } else if (scriptContext.request.method === http.Method.POST) {
        const req = scriptContext.request;
        const Object = req.parameters.custpage_line_items;
        const file = util.createCSVFile(JSON.parse(Object));
        scriptContext.response.writeFile(file);
      }
    } catch (error) {
      log.error(functionName, { error: error.toString() });
    }
  };

  /**
   * It creates a form, adds a client script to it, creates header fields, and then creates a sublist of
   * items
   * @param params -
   * @returns The form object is being returned.
   */
  const displayForm = (params) => {
    try {
      let form = serverWidget.createForm({
        title: "Rebate Contract",
      });
      form.clientScriptFileId = util.getFileId("bsp_isg_cs_item_rebate.js");
      form = createHeaderFields(form, params);

      return form;
    } catch (e) {
      log.error("displayForm", e.message);
    }
  };

  /**
   * It creates the header fields for the form
   * @param form - The form object that we are going to add fields to.
   * @param params - This is an object that contains the following properties:
   * @returns The form object is being returned.
   */
  const createHeaderFields = (form, params) => {
    try {
      /**
       * Field Group Rebates
       */
      form.addFieldGroup({
        id: "fieldgroup_rebates_info",
        label: "Filters",
      });

      let contractList;
      const vendor = form.addField({
        id: "custpage_vendor",
        type: serverWidget.FieldType.SELECT,
        label: "Vendor",
        container: "fieldgroup_rebates_info",
      });
      vendor.addSelectOption({
        value: "",
        text: "",
      });
      const contractId = form.addField({
        id: "custpage_rebate_contract",
        type: serverWidget.FieldType.SELECT,
        label: "Rebate Contract",
        container: "fieldgroup_rebates_info",
      });
      contractId.addSelectOption({
        value: "",
        text: "",
      });

      if (params.vendorSelected) {
        vendor.defaultValue = params.vendorSelected;
        contractList = util.getContractList(params.vendorSelected);
        contractList.forEach(function (result) {
          contractId.addSelectOption({
            value: result.value,
            text: result.text,
          });
        });
      }
      let itemList = [];
      if (params.rebateContractSelected) {
        contractId.defaultValue = params.rebateContractSelected;
        itemList = util.getItem(params.rebateContractSelected);
        log.debug("itemList", itemList.length);
      }
      let itemfields = form
          .addField({
            id: "custpage_item",
            type: serverWidget.FieldType.LONGTEXT,
            label: "item",
            container: "fieldgroup_rebates_info",
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN,
          });

      util.getVendor().forEach(function (result) {
        vendor.addSelectOption({
          value: result.value,
          text: result.text,
        });
      });
      vendor.isMandatory = true;
      let result = form
          .addField({
            id: "custpage_line_items",
            type: serverWidget.FieldType.LONGTEXT,
            label: "Result OBj",
            container: "fieldgroup_rebates_info",
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN,
          });
      let dateFilter = form.addField({
        id: "custpage_date_filter",
        type: serverWidget.FieldType.SELECT,
        label: "Date Filter",
        container: "fieldgroup_rebates_info",
      });

      dateFilter.addSelectOption({
        value: "",
        text: "",
      });

      let dateQuickFilter = util.createQuickFilter();
      dateQuickFilter.forEach((filter) =>
          dateFilter.addSelectOption({
            value: filter.value,
            text: filter.text,
          })
      );
      if (itemList.length > 0 && params.dateFilter) {
        itemfields.defaultValue = JSON.stringify(itemList);
        let soLine = util.getTransactionLine(itemList, params.dateFilter);
        result.defaultValue = JSON.stringify(soLine);
        createItemSublist(form, soLine);
      }
      form.addFieldGroup({
        id: "fieldgroup_items_info",
        label: "Item list",
      });

      form.addSubmitButton({
        id: "custpage_generate_summary_invoice",
        label: "Export CSV",
      });
      return form;
    } catch (e) {
      log.error("createHeaderFields", e.message);
    }
  };

  /**
   * It creates a sublist on the form and populates it with the items that are passed in
   * @param form - The form object that we are adding the sublist to.
   * @param items - An array of objects that contain the item information.
   * @returns The form is being returned.
   */
  const createItemSublist = (form, items) => {
    let sublist = form.addSublist({
      id: "custpage_items_sublist",
      type: serverWidget.SublistType.LIST,
      label: "Item List",
    });
    sublist
        .addField({
          id: "custpage_entity",
          type: serverWidget.FieldType.TEXT,
          label: "Customer",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });
    sublist
        .addField({
          id: "custpage_manufacturer",
          type: serverWidget.FieldType.TEXT,
          label: "Manufacturer",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });
    sublist
        .addField({
          id: "custpage_description",
          type: serverWidget.FieldType.TEXT,
          label: "Description",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });
    sublist
        .addField({
          id: "custpage_document_number",
          type: serverWidget.FieldType.TEXT,
          label: "Document Number",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });
    sublist
        .addField({
          id: "custpage_item",
          type: serverWidget.FieldType.TEXT,
          label: "Product",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });
    sublist
        .addField({
          id: "custpage_quantity",
          type: serverWidget.FieldType.TEXT,
          label: "Quantity",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

    sublist.addField({
      id: "custpage_rate",
      type: serverWidget.FieldType.CURRENCY,
      label: "Invoice Rate",
    });
    sublist
        .addField({
          id: "custpage_bid_price",
          type: serverWidget.FieldType.CURRENCY,
          label: "Bid Price",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

    sublist
        .addField({
          id: "custpage_date",
          type: serverWidget.FieldType.TEXT,
          label: "Date",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.DISABLED,
        });

    pupulateItemSublist(sublist, items);

    return form;
  };

  /**
   * It takes a sublist and an array of items, and populates the sublist with the items
   * @param sublist - The sublist object
   * @param items - This is the array of items that you want to populate the sublist with.
   */
  const pupulateItemSublist = (sublist, items) => {
    if (items.length > 0) {
      let suiteletCache = cache.getCache({
        name: "itemsCache",
        scope: cache.Scope.PRIVATE,
      });

      let lineCount = 0;
      items.forEach((element) => {
        let item = element.Product;
        let documentNumber = element.Document_Number;
        let date = element.Date;
        let entity = element.End_User;
        let rate = element.Invoice_Price;
        let manufacturer = element.Manufacturer;
        let description = element.Description;
        let quantity = element.Quantity;
        let bidPrice = element.Bid_Price;

        sublist.setSublistValue({
          id: "custpage_manufacturer",
          line: lineCount,
          value: manufacturer ? manufacturer : "",
        });
        sublist.setSublistValue({
          id: "custpage_quantity",
          line: lineCount,
          value: quantity ? quantity : 0,
        });
        sublist.setSublistValue({
          id: "custpage_description",
          line: lineCount,
          value: description ? description : " ",
        });
        sublist.setSublistValue({
          id: "custpage_item",
          line: lineCount,
          value: item ? item : "",
        });
        sublist.setSublistValue({
          id: "custpage_document_number",
          line: lineCount,
          value: documentNumber ? documentNumber : "",
        });
        sublist.setSublistValue({
          id: "custpage_date",
          line: lineCount,
          value: date ? date : "",
        });
        sublist.setSublistValue({
          id: "custpage_entity",
          line: lineCount,
          value: entity ? entity : "",
        });
        sublist.setSublistValue({
          id: "custpage_rate",
          line: lineCount,
          value: rate ? rate : 0.0,
        });
        sublist.setSublistValue({
          id: "custpage_bid_price",
          line: lineCount,
          value: bidPrice ? bidPrice : 0.0,
        });

        suiteletCache.put({
          key: documentNumber,
          value: JSON.stringify(documentNumber),
        });

        lineCount++;
      });
    }
  };

  return { onRequest };
});
