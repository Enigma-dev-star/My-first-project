package com.muslimsweets.msms.data.local.room

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ShopDao {
    @Query("SELECT * FROM shops ORDER BY createdAt ASC")
    fun getAllShops(): Flow<List<ShopEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertShop(shop: ShopEntity)

    @Delete
    suspend fun deleteShop(shop: ShopEntity)
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE shopId = :shopId ORDER BY nameBn ASC")
    fun getProductsByShop(shopId: String): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: ProductEntity)

    @Query("UPDATE products SET currentStock = :newStock, updatedAt = :time WHERE id = :id")
    suspend fun updateStock(id: String, newStock: Double, time: Long = System.currentTimeMillis())

    @Query("DELETE FROM products WHERE id = :productId")
    suspend fun deleteProductById(productId: String)

    @Query("UPDATE products SET currentStock = 0 WHERE shopId = :shopId")
    suspend fun eraseAllStockForShop(shopId: String)
}

@Dao
interface StockMovementDao {
    @Query("SELECT * FROM stock_movements WHERE shopId = :shopId ORDER BY timestamp DESC")
    fun getMovementsByShop(shopId: String): Flow<List<StockMovementEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMovement(movement: StockMovementEntity)
}

@Dao
interface SaleDao {
    @Query("SELECT * FROM sales WHERE shopId = :shopId ORDER BY timestamp DESC")
    fun getSalesByShop(shopId: String): Flow<List<SaleEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSale(sale: SaleEntity)

    @Query("DELETE FROM sales WHERE shopId = :shopId")
    suspend fun clearSalesForShop(shopId: String)
}

@Dao
interface BillDao {
    @Query("SELECT * FROM bills WHERE shopId = :shopId ORDER BY timestamp DESC")
    fun getBillsByShop(shopId: String): Flow<List<BillEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBill(bill: BillEntity)

    @Query("DELETE FROM bills WHERE shopId = :shopId")
    suspend fun clearBillsForShop(shopId: String)
}

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE role = 'master_admin' LIMIT 1")
    suspend fun getMasterAdmin(): UserEntity?

    @Query("SELECT * FROM users WHERE role = 'guest_viewer'")
    fun getGuestUsers(): Flow<List<UserEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: UserEntity)
}

@Dao
interface ActionHistoryDao {
    @Query("SELECT * FROM action_history ORDER BY timestamp DESC LIMIT 100")
    fun getRecentActions(): Flow<List<ActionHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAction(action: ActionHistoryEntity)
}
