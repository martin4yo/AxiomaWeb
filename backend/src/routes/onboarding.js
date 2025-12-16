"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var authMiddleware_js_1 = require("../middleware/authMiddleware.js");
var tenantMiddleware_js_1 = require("../middleware/tenantMiddleware.js");
var client_1 = require("@prisma/client");
var router = (0, express_1.Router)();
var prisma = new client_1.PrismaClient();
// GET /:tenantSlug/onboarding/status
// Obtiene el estado actual del wizard de onboarding
router.get('/:tenantSlug/onboarding/status', tenantMiddleware_js_1.tenantMiddleware, authMiddleware_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tenant;
    return __generator(this, function (_a) {
        try {
            tenant = req.tenant;
            res.json({
                wizardCompleted: tenant.wizardCompleted,
                wizardStep: tenant.wizardStep,
                data: {} // TODO: Recuperar datos guardados del wizard si se implementa persistencia
            });
        }
        catch (error) {
            console.error('Error getting onboarding status:', error);
            res.status(500).json({ error: 'Error al obtener el estado del onboarding' });
        }
        return [2 /*return*/];
    });
}); });
// PUT /:tenantSlug/onboarding/step/:step
// Guarda el progreso de un paso del wizard
router.put('/:tenantSlug/onboarding/step/:step', tenantMiddleware_js_1.tenantMiddleware, authMiddleware_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var tenant, step, _a, wizardStep, data, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                tenant = req.tenant;
                step = parseInt(req.params.step);
                _a = req.body, wizardStep = _a.wizardStep, data = _a.data;
                // Actualizar el paso actual en el tenant
                return [4 /*yield*/, prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            wizardStep: Math.max(tenant.wizardStep, step)
                        }
                    })
                    // TODO: Guardar datos del wizard si se implementa persistencia
                ];
            case 1:
                // Actualizar el paso actual en el tenant
                _b.sent();
                // TODO: Guardar datos del wizard si se implementa persistencia
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _b.sent();
                console.error('Error saving wizard step:', error_1);
                res.status(500).json({ error: 'Error al guardar el progreso del wizard' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// PUT /:tenantSlug/onboarding/complete
// Completa el wizard y crea todos los datos necesarios
router.put('/:tenantSlug/onboarding/complete', tenantMiddleware_js_1.tenantMiddleware, authMiddleware_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, tenant, user, data, existingBranch, branch, paymentMethodMap, _i, _b, code, pmData, existing, categoryMap, _c, _d, code, categoryName, existing, _e, _f, warehouse, existing, existingWarehouse, salesPoint, afipConnection, existingAfipConnection, voucherTypes, _g, voucherTypes_1, voucherType, existing, printTemplate, existingConsumidorFinal, cfVatCondition, error_2;
    var _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                _j.trys.push([0, 41, , 42]);
                _a = req, tenant = _a.tenant, user = _a.user;
                data = req.body.data;
                // Actualizar datos del tenant
                return [4 /*yield*/, prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            wizardCompleted: true,
                            wizardStep: 11,
                            businessName: data.businessName,
                            cuit: data.cuit,
                            address: data.address,
                            phone: data.phone,
                            email: data.email,
                            logo: data.logo,
                            vatConditionId: data.vatConditionId,
                            grossIncomeNumber: data.grossIncomeNumber,
                            activityStartDate: data.activityStartDate ? new Date(data.activityStartDate) : null
                        }
                    })
                    // Crear sucursal por defecto si no existe
                ];
            case 1:
                // Actualizar datos del tenant
                _j.sent();
                return [4 /*yield*/, prisma.branch.findFirst({
                        where: { tenantId: tenant.id }
                    })];
            case 2:
                existingBranch = _j.sent();
                branch = existingBranch;
                if (!!branch) return [3 /*break*/, 4];
                return [4 /*yield*/, prisma.branch.create({
                        data: {
                            tenantId: tenant.id,
                            code: 'CENTRAL',
                            name: 'Casa Central',
                            addressLine1: data.address || '',
                            isDefault: true
                        }
                    })];
            case 3:
                branch = _j.sent();
                _j.label = 4;
            case 4:
                if (!(data.paymentMethods && data.paymentMethods.length > 0)) return [3 /*break*/, 9];
                paymentMethodMap = {
                    CASH: { name: 'Efectivo', paymentType: 'CASH' },
                    DEBIT: { name: 'Tarjeta de Débito', paymentType: 'CARD' },
                    CREDIT: { name: 'Tarjeta de Crédito', paymentType: 'CARD' },
                    TRANSFER: { name: 'Transferencia', paymentType: 'TRANSFER' },
                    CHECK: { name: 'Cheque', paymentType: 'CHECK' },
                    MP: { name: 'Mercado Pago', paymentType: 'TRANSFER' },
                    CC: { name: 'Cuenta Corriente', paymentType: 'OTHER' }
                };
                _i = 0, _b = data.paymentMethods;
                _j.label = 5;
            case 5:
                if (!(_i < _b.length)) return [3 /*break*/, 9];
                code = _b[_i];
                pmData = paymentMethodMap[code];
                if (!pmData)
                    return [3 /*break*/, 8];
                return [4 /*yield*/, prisma.paymentMethod.findFirst({
                        where: {
                            tenantId: tenant.id,
                            name: pmData.name
                        }
                    })];
            case 6:
                existing = _j.sent();
                if (!!existing) return [3 /*break*/, 8];
                return [4 /*yield*/, prisma.paymentMethod.create({
                        data: {
                            tenantId: tenant.id,
                            name: pmData.name,
                            paymentType: pmData.paymentType,
                            isActive: true
                        }
                    })];
            case 7:
                _j.sent();
                _j.label = 8;
            case 8:
                _i++;
                return [3 /*break*/, 5];
            case 9:
                if (!(data.categories && data.categories.length > 0)) return [3 /*break*/, 14];
                categoryMap = {
                    PROD: 'Productos',
                    SERV: 'Servicios',
                    INSU: 'Insumos',
                    REPR: 'Repuestos',
                    OTRO: 'Otros'
                };
                _c = 0, _d = data.categories;
                _j.label = 10;
            case 10:
                if (!(_c < _d.length)) return [3 /*break*/, 14];
                code = _d[_c];
                categoryName = categoryMap[code];
                if (!categoryName)
                    return [3 /*break*/, 13];
                return [4 /*yield*/, prisma.productCategory.findFirst({
                        where: {
                            tenantId: tenant.id,
                            name: categoryName
                        }
                    })];
            case 11:
                existing = _j.sent();
                if (!!existing) return [3 /*break*/, 13];
                return [4 /*yield*/, prisma.productCategory.create({
                        data: {
                            tenantId: tenant.id,
                            name: categoryName,
                            isActive: true
                        }
                    })];
            case 12:
                _j.sent();
                _j.label = 13;
            case 13:
                _c++;
                return [3 /*break*/, 10];
            case 14:
                if (!(data.warehouses && data.warehouses.length > 0)) return [3 /*break*/, 20];
                _e = 0, _f = data.warehouses;
                _j.label = 15;
            case 15:
                if (!(_e < _f.length)) return [3 /*break*/, 19];
                warehouse = _f[_e];
                return [4 /*yield*/, prisma.warehouse.findFirst({
                        where: { tenantId: tenant.id, code: warehouse.code }
                    })];
            case 16:
                existing = _j.sent();
                if (!!existing) return [3 /*break*/, 18];
                return [4 /*yield*/, prisma.warehouse.create({
                        data: {
                            tenantId: tenant.id,
                            code: warehouse.code,
                            name: warehouse.name,
                            address: warehouse.address || null,
                            isActive: true
                        }
                    })];
            case 17:
                _j.sent();
                _j.label = 18;
            case 18:
                _e++;
                return [3 /*break*/, 15];
            case 19: return [3 /*break*/, 23];
            case 20: return [4 /*yield*/, prisma.warehouse.findFirst({
                    where: { tenantId: tenant.id }
                })];
            case 21:
                existingWarehouse = _j.sent();
                if (!!existingWarehouse) return [3 /*break*/, 23];
                return [4 /*yield*/, prisma.warehouse.create({
                        data: {
                            tenantId: tenant.id,
                            code: 'MAIN',
                            name: 'Almacén Principal',
                            address: null,
                            isActive: true
                        }
                    })];
            case 22:
                _j.sent();
                _j.label = 23;
            case 23: return [4 /*yield*/, prisma.salesPoint.findFirst({
                    where: { tenantId: tenant.id }
                })];
            case 24:
                salesPoint = _j.sent();
                if (!!salesPoint) return [3 /*break*/, 26];
                return [4 /*yield*/, prisma.salesPoint.create({
                        data: {
                            tenantId: tenant.id,
                            number: data.afipSalesPoint || 1,
                            name: "Punto de Venta ".concat(data.afipSalesPoint || 1),
                            isActive: true
                        }
                    })];
            case 25:
                salesPoint = _j.sent();
                _j.label = 26;
            case 26:
                afipConnection = null;
                if (!(data.afipCertificate && data.afipPrivateKey)) return [3 /*break*/, 30];
                return [4 /*yield*/, prisma.afipConnection.findFirst({
                        where: { tenantId: tenant.id }
                    })];
            case 27:
                existingAfipConnection = _j.sent();
                if (!!existingAfipConnection) return [3 /*break*/, 29];
                return [4 /*yield*/, prisma.afipConnection.create({
                        data: {
                            tenantId: tenant.id,
                            name: data.afipEnvironment === 'production' ? 'Producción AFIP' : 'Testing AFIP',
                            cuit: data.cuit,
                            environment: data.afipEnvironment || 'testing',
                            isActive: true
                        }
                    })];
            case 28:
                afipConnection = _j.sent();
                return [3 /*break*/, 30];
            case 29:
                afipConnection = existingAfipConnection;
                _j.label = 30;
            case 30:
                if (!(data.voucherTypes && data.voucherTypes.length > 0)) return [3 /*break*/, 36];
                return [4 /*yield*/, prisma.voucherType.findMany({
                        where: {
                            code: {
                                in: data.voucherTypes
                            }
                        }
                    })];
            case 31:
                voucherTypes = _j.sent();
                _g = 0, voucherTypes_1 = voucherTypes;
                _j.label = 32;
            case 32:
                if (!(_g < voucherTypes_1.length)) return [3 /*break*/, 36];
                voucherType = voucherTypes_1[_g];
                return [4 /*yield*/, prisma.voucherConfiguration.findFirst({
                        where: {
                            tenantId: tenant.id,
                            voucherTypeId: voucherType.id
                        }
                    })];
            case 33:
                existing = _j.sent();
                if (!!existing) return [3 /*break*/, 35];
                printTemplate = ((_h = data.printConfigs) === null || _h === void 0 ? void 0 : _h[voucherType.code]) || 'thermal-80mm';
                return [4 /*yield*/, prisma.voucherConfiguration.create({
                        data: {
                            tenantId: tenant.id,
                            voucherTypeId: voucherType.id,
                            branchId: branch.id,
                            afipConnectionId: (afipConnection === null || afipConnection === void 0 ? void 0 : afipConnection.id) || null,
                            salesPointId: salesPoint.id,
                            nextVoucherNumber: 1,
                            printTemplate: printTemplate,
                            isActive: true
                        }
                    })];
            case 34:
                _j.sent();
                _j.label = 35;
            case 35:
                _g++;
                return [3 /*break*/, 32];
            case 36: return [4 /*yield*/, prisma.entity.findFirst({
                    where: {
                        tenantId: tenant.id,
                        code: 'CF001'
                    }
                })];
            case 37:
                existingConsumidorFinal = _j.sent();
                if (!!existingConsumidorFinal) return [3 /*break*/, 40];
                return [4 /*yield*/, prisma.vatCondition.findFirst({
                        where: {
                            tenantId: tenant.id,
                            code: 'CF'
                        }
                    })];
            case 38:
                cfVatCondition = _j.sent();
                return [4 /*yield*/, prisma.entity.create({
                        data: {
                            tenantId: tenant.id,
                            code: 'CF001',
                            name: 'Consumidor Final',
                            isCustomer: true,
                            isSupplier: false,
                            isEmployee: false,
                            country: 'AR',
                            currency: 'ARS',
                            cuit: (cfVatCondition === null || cfVatCondition === void 0 ? void 0 : cfVatCondition.code) || null,
                            ivaCondition: (cfVatCondition === null || cfVatCondition === void 0 ? void 0 : cfVatCondition.code) || null,
                            isDefaultCustomer: true,
                            customerPaymentTerms: 0,
                            customerCreditLimit: 0
                        }
                    })];
            case 39:
                _j.sent();
                _j.label = 40;
            case 40:
                // TODO: Invitar usuarios si hay en data.invitedUsers
                res.json({ success: true });
                return [3 /*break*/, 42];
            case 41:
                error_2 = _j.sent();
                console.error('Error completing wizard:', error_2);
                res.status(500).json({ error: 'Error al completar el wizard de configuración' });
                return [3 /*break*/, 42];
            case 42: return [2 /*return*/];
        }
    });
}); });
// POST /:tenantSlug/onboarding/skip
// Permite omitir el wizard completamente (solo admin)
router.post('/:tenantSlug/onboarding/skip', tenantMiddleware_js_1.tenantMiddleware, authMiddleware_js_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, tenant, user, tenantUser, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req, tenant = _a.tenant, user = _a.user;
                return [4 /*yield*/, prisma.tenantUser.findFirst({
                        where: {
                            tenantId: tenant.id,
                            userId: user.id,
                            role: 'admin'
                        }
                    })];
            case 1:
                tenantUser = _b.sent();
                if (!tenantUser) {
                    return [2 /*return*/, res.status(403).json({ error: 'Solo los administradores pueden omitir el wizard' })];
                }
                // Marcar como completado
                return [4 /*yield*/, prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            wizardCompleted: true,
                            wizardStep: 11
                        }
                    })];
            case 2:
                // Marcar como completado
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _b.sent();
                console.error('Error skipping wizard:', error_3);
                res.status(500).json({ error: 'Error al omitir el wizard' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
