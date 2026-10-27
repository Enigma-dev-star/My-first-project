package com.muslimsweets.msms.data.local.room

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "shops")
data class ShopEntity(
    @PrimaryKey val id: String,
    val name: String,
    val nameBn: String,
    val address: String,
    val country: String,
    val currencySymbol: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val shopId: String,
    val name: String,
    val nameBn: String,
    val unit: String, // "kg" or "piece"
    val unitPrice: Double,
    val costPrice: Double,
    val currentStock: Double,
    val minStockAlert: Double,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "stock_movements")
data class StockMovementEntity(
    @PrimaryKey val id: String,
    val shopId: String,
    val productId: String,
    val productName: String,
    val productNameBn: String,
    val quantityAdded: Double,
    val unit: String,
    val costPrice: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val notes: String? = null
)

@Entity(tableName = "sales")
data class SaleEntity(
    @PrimaryKey val id: String,
    val shopId: String,
    val productId: String,
    val productName: String,
    val productNameBn: String,
    val quantitySold: Double,
    val unit: String,
    val pricePerUnit: Double,
    val totalAmount: Double,
    val costTotal: Double,
    val previousStock: Double,
    val remainingStock: Double,
    val timestamp: Long = System.currentTimeMillis(),
    val year: Int,
    val month: Int,
    val dayOfWeek: Int
)

@Entity(tableName = "bills")
data class BillEntity(
    @PrimaryKey val id: String,
    val shopId: String,
    val type: String, // "sale" or "expense"
    val title: String,
    val titleBn: String? = null,
    val amount: Double,
    val paymentMethod: String,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val name: String,
    val role: String, // "master_admin" or "guest_viewer"
    val passwordHash: String,
    val securityQuestion: String? = null,
    val securityAnswerHash: String? = null,
    val stockErasePasswordHash: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "action_history")
data class ActionHistoryEntity(
    @PrimaryKey val id: String,
    val action: String,
    val details: String,
    val timestamp: Long = System.currentTimeMillis()
)
