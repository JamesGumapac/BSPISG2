/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './lodash.min.js', 'N/task', 'N/format', 'N/config'], function (search, record, lodash, task, format, config) {
    
    const CONTANTS = Object.freeze({
        actionCode: "R",
        documentControlNumber: "00001"
    });


    /**
     * Returns Integration Project Constants
     * @returns 
    */
    function constants(){
        return CONTANTS;
    }

    /**
     * Check for Empty value
     * @param {*} value 
     * @returns 
    */
	function isEmpty(value) {
		return (
			value === "" ||
			value == null ||
			value == undefined ||
			value == "null" ||
			value == "undefined" ||
			(value.constructor === Array && value.length == 0) ||
			(value.constructor === Object &&
				(function (v) {
					for (let k in v) return false;
					return true;
				})(value))
		);
	}

    /**
     * Returns value of property
     * @param {*} obj 
     * @param {*} prop 
     * @returns 
    */
    function getProp(obj, prop) {
        if (typeof obj !== "object") throw "getProp: obj is not an object";
        if (typeof prop !== "string") throw "getProp: prop is not a string";

        // Replace [] notation with dot notation
        prop = prop.replace(/\[["'`](.*)["'`]\]/g, ".$1");

        return prop
            .split(".")
            .reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
    }


    /**
     * It returns an object with two properties: productsSavedSearch and vendorUniqueID.
     * @param currentTime - The current time in the format of "HH:MM"
     * @returns The transmition object is being returned.
    */
    function getTransmition(currentTime){
        let transmition = null;
        const transmitionSearchObj = search.create({
            type: "customrecord_bsp_lb_transmition",
            filters:
            [],
            columns:
            [
               search.createColumn({
                  name: "name",
                  sort: search.Sort.ASC,
                  label: "Name"
               }),
               search.createColumn({name: "custrecord_bsp_lb_transmition_ss", label: "Saved Search"}),
               search.createColumn({name: "custrecord_bsp_lb_vendor_account", label: "Vendor account"}),
               search.createColumn({
                    name: "custentity_bsp_lb_essendant_unique_id",
                    join: "CUSTRECORD_BSP_LB_VENDOR_ACCOUNT",
                    label: "Essendant Unique ID"
               }),
               search.createColumn({name: "custrecord_bsp_lb_template_xml_file", label: "Template XML File"}),
               search.createColumn({name: "custrecord_bsp_lb_frequency", label: "Frequency"}),
               search.createColumn({name: "custrecord_bsp_lb_months", label: "Months"}),
               search.createColumn({name: "custrecord_bsp_lb_day_of_month", label: "Day of Month"}),
               search.createColumn({name: "custrecord_bsp_lb_time_of_day", label: "Time of Day"}),
               search.createColumn({name: "custrecord_bsp_lb_weekdays", label: "Weekdays"})
            ]
        });

        transmitionSearchObj.run().each(function(result){
            let ordersSavedSearch = result.getValue({
                name: "custrecord_bsp_lb_transmition_ss"
            });
            let vendorName = result.getValue({
                name: "custrecord_bsp_lb_vendor_account"
            });
            let vendorUniqueID = result.getValue({
                name: "custentity_bsp_lb_essendant_unique_id",
                join: 'CUSTRECORD_BSP_LB_VENDOR_ACCOUNT'
            });
            let templateXMLfile = result.getValue({
                name: "custrecord_bsp_lb_template_xml_file"
            });
            transmition = {ordersSavedSearch: ordersSavedSearch, vendorName: vendorName, vendorUniqueID: vendorUniqueID, templateXMLfile: templateXMLfile};
            return true;
        });
        return transmition;
    }


    /**
     * It takes a search ID, runs the search, and returns an array of Orders that contain the data from
     * the search.
     * @param searchId - The id of the saved search you want to run.
     * @returns An array of Orders.
    */
    function getOrdersData(searchId){
        let orders = [];
        let ordersSearch = search.load({id: searchId});

        ordersSearch.columns.push(search.createColumn({name: "shipaddress1", label: "Shipping Address 1"}));
        ordersSearch.columns.push(search.createColumn({name: "shipaddress2", label: "Shipping Address 2"}));
        ordersSearch.columns.push(search.createColumn({name: "shipaddress3", label: "Shipping Address 3"}));
        ordersSearch.columns.push(search.createColumn({name: "shipaddressee", label: "Shipping Addressee"}));
        ordersSearch.columns.push(search.createColumn({name: "shipcity", label: "Shipping City"}));
        ordersSearch.columns.push(search.createColumn({name: "shipstate", label: "Shipping State/Province"}));
        ordersSearch.columns.push(search.createColumn({name: "shipzip", label: "Shipping Zip"}));

        ordersSearch.run().each(function(result){  
            let salesOrderID = result.id;
            let salesOrderNumber = result.getValue({name: "tranid"});
            let orderDate = result.getValue({name: "datecreated"});
            let routeCodeID = result.getValue({name: "custbody_bsp_lb_route_code"});
            let routeCode = result.getText({name: "custbody_bsp_lb_route_code"});
            let accountNumber = result.getText({
                name: "custrecord_bsp_lb_account_number",
                join: 'CUSTBODY_BSP_LB_ROUTE_CODE'
            });

            let addr1 = result.getValue({name: "shipaddress1"});
            let addr2 = result.getValue({name: "shipaddress2"});
            let addr3 = result.getValue({name: "shipaddress3"});
            let city = result.getValue({name: "shipcity"});
            let state = result.getValue({name: "shipstate"});
            let zipCode = result.getValue({name: "shipzip"});
            let addressee = result.getValue({name: "shipaddressee"});

            let address = {
                addr1: addr1,
                addr2: addr2,
                addr3: addr3,
                city: city,
                state: state,
                zipCode: zipCode,
                addressee: addressee
            };

            let item = result.getText({name: "item"});
            let itemLineNumber = result.getValue({name: "line"});
            let itemQuantity = result.getValue({name: "quantity"});
            let itemUnitPrice = result.getValue({name: "rate"});

            if(_.indexOf(orders,salesOrderID) == -1){
                orders.push({
                    poID: '1',
                    poNumber: 'PO-1',
                    poDate: orderDate,
                    salesOrderNumber: salesOrderNumber,
                    salesOrderID: salesOrderID,
                    accountNumber: accountNumber,
                    routeCode: routeCode,
                    routeCodeID: routeCodeID,
                    vendorName: "Essendant Inc",
                    address: address,
                    items: [{
                        lineNumber: itemLineNumber,
                        itemNumber: item,
                        quantity: itemQuantity,
                        unitPrice: itemUnitPrice
                    }]
                })
            }else{
                orders[getOrderPosition(orders,salesOrderID)].items.push({
                    lineNumber: itemLineNumber,
                    itemNumber: item,
                    quantity: itemQuantity,
                    unitPrice: itemUnitPrice
                })
            }
            return true;
        });
        return orders;
    }


    /**
     * It returns the index of the order in the orders array that has the salesOrderID that matches the
     * salesOrderID passed in as a parameter.
     * @param orders - the array of orders
     * @param salesOrderID - The ID of the order you want to update.
     * @returns The index of the order in the orders array.
    */
    function getOrderPosition(orders, salesOrderID){
        for (let index = 0; index < orders.length; index++) {
            if(orders[index].salesOrderID == salesOrderID)  {
                return index;
            }
        }
        return -1;
    }
    /**
     * It returns the company name from the company information record.
     * @returns The company name.
    */
    function getCompanyInfo(){
        let companyInfo = config.load({
            type: config.Type.COMPANY_INFORMATION
        });
        let companyName = companyInfo.getValue({
            fieldId:'companyname'
        });
        companyName = companyName.replace("&","and");
        return companyName || null;
    }

    return {
        constants: constants,
        isEmpty:isEmpty,
        getProp: getProp,
        getTransmition: getTransmition,
        getCompanyInfo: getCompanyInfo,
        getOrdersData: getOrdersData
	};
});
