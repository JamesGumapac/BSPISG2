/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_lb_service_api.js'],
 function (BSPLBServiceAPI){

    /**
    * Login request
    * @param {*} integrationSettings
    * @returns 
    */
    function login(integrationSettings){
        let loginData = {};
        let userID = integrationSettings.custrecord_bsp_lb_user_id;
        let password = integrationSettings.custrecord_bsp_lb_password;

        let serviceURL = integrationSettings.custrecord_bsp_lb_orders_service_url;
        let soapLoginAction = integrationSettings.custrecord_bsp_lb_login_soap_action;

        let requestBodyXML = getLoginXMLStrRequest(userID, password);

        loginData = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapLoginAction);
        loginData = loginData.LoginResponse.LoginResult;

        return loginData;
    }

    /**
     * Body of Login Request
     * @param {*} userID
     * @param {*} password
     * @returns 
    */
    function getLoginXMLStrRequest(userID, password){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <tem:Login>
                            <tem:username>${userID}</tem:username>
                            <tem:password>${password}</tem:password>
                        </tem:Login>
                    </soapenv:Body>
                </soapenv:Envelope>`;
    }

    return {
        login: login
    };
});