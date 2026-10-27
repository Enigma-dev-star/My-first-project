package com.muslimsweets.msms.data.repository

import com.muslimsweets.msms.data.local.room.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Offline-first repository coordinating Room database operations.
 * Supports decimal and float quantities for both kg and pieces.
 */
class SweetShopRepository(private val db: AppDatabase) {

    fun getShops(): Flow<List<ShopEntity>> = db.shopDao().getAllShops()

    suspend fun saveShop(shop: ShopEntity) = db.shopDao().insertShop(shop)

    fun getProductsByShop(shopId: String): Flow<List<ProductEntity>> =
        db.productDao().getProductsByShop(shopId)

    suspend fun saveProduct(product: ProductEntity) =
        db.productDao().insertProduct(product)

    suspend fun updateStock(productId: String, newStock: Double) =
        db.productDao().updateStock(productId, newStock)

    suspend fun deleteProduct(productId: String) =
        db.productDao().deleteProductById(productId)

    suspend fun eraseStockForShop(shopId: String) =
        db.productDao().eraseAllStockForShop(shopId)

    fun getMovements(shopId: String): Flow<List<StockMovementEntity>> =
        db.stockMovementDao().getMovementsByShop(shopId)

    suspend fun recordStockIntake(movement: StockMovementEntity) {
        db.stockMovementDao().insertMovement(movement)
    }

    fun getSales(shopId: String): Flow<List<SaleEntity>> =
        db.saleDao().getSalesByShop(shopId)

    suspend fun recordSale(sale: SaleEntity) {
        db.saleDao().insertSale(sale)
        db.productDao().updateStock(sale.productId, sale.remainingStock)
    }

    suspend fun clearSales(shopId: String) = db.saleDao().clearSalesForShop(shopId)

    fun getBills(shopId: String): Flow<List<BillEntity>> =
        db.billDao().getBillsByShop(shopId)

    suspend fun recordBill(bill: BillEntity) = db.billDao().insertBill(bill)

    suspend fun clearBills(shopId: String) = db.billDao().clearBillsForShop(shopId)

    suspend fun getMasterAdmin(): UserEntity? = db.userDao().getMasterAdmin()

    fun getGuestUsers(): Flow<List<UserEntity>> = db.userDao().getGuestUsers()

    suspend fun saveUser(user: UserEntity) = db.userDao().insertUser(user)

    fun getActionHistory(): Flow<List<ActionHistoryEntity>> =
        db.actionHistoryDao().getRecentActions()

    suspend fun logAction(action: String, details: String) {
        db.actionHistoryDao().insertAction(
            ActionHistoryEntity(
                id = java.util.UUID.randomUUID().toString(),
                action = action,
                details = details
            )
        )
    }
}
