import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useEffect, useMemo, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { Customer, Product } from "@/types";

const COLORS = {
  cream: "#F7EEDC",
  card: "#FFF9EE",
  brown: "#5A3825",
  lightBrown: "#A9745B",
  gold: "#B8894A",
  dark: "#2B1A12",
  white: "#FFFFFF",
};

export default function OrderScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  const [platform, setPlatform] = useState("Messenger");

  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  useEffect(() => {
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch(() => Alert.alert("Error", "Cannot connect to backend."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const value = customerSearch.trim();

      if (selectedCustomer?.name === value) return;

      if (value.length < 2) {
        setCustomers([]);
        return;
      }

      try {
        setCustomerLoading(true);
        const res = await api.get(
          `/customers?search=${encodeURIComponent(value)}`,
        );
        setCustomers(res.data);
      } catch {
        setCustomers([]);
      } finally {
        setCustomerLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer]);

  const filteredProducts = useMemo(() => {
    const value = productSearch.trim().toLowerCase();

    if (!value) return products;

    return products.filter((p) => {
      const productMatch = p.name.toLowerCase().includes(value);
      const variantMatch = p.variants.some((v) =>
        v.label.toLowerCase().includes(value),
      );

      return productMatch || variantMatch;
    });
  }, [products, productSearch]);

  const addItem = (product: Product, variant: any) => {
    Keyboard.dismiss();

    const key = `${product.id}-${variant.id}`;
    const current = items[key];

    setItems({
      ...items,
      [key]: {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantLabel: variant.label,
        price: current ? current.price : variant.price,
        quantity: current ? current.quantity + 1 : 1,
      },
    });
  };

  const removeItem = (product: Product, variant: any) => {
    const key = `${product.id}-${variant.id}`;
    const current = items[key];

    if (!current) return;

    if (current.quantity <= 1) {
      const copy = { ...items };
      delete copy[key];
      setItems(copy);
      return;
    }

    setItems({
      ...items,
      [key]: {
        ...current,
        quantity: current.quantity - 1,
      },
    });
  };

  const updatePrice = (key: string, value: string) => {
    setItems({
      ...items,
      [key]: {
        ...items[key],
        price: Number(value) || 0,
      },
    });
  };

  const total = Object.values(items).reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0,
  );

  const totalQty = Object.values(items).reduce(
    (sum: number, item: any) => sum + item.quantity,
    0,
  );

  const saveCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert("Required", "Customer name is required.");
      return;
    }

    try {
      const res = await api.post("/customers", {
        name: newCustomerName,
        contact: newCustomerPhone,
        address: newCustomerAddress,
        platform,
      });

      setSelectedCustomer(res.data);
      setCustomerSearch(res.data.name);
      setCustomers([]);

      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setCustomerModalOpen(false);
    } catch {
      Alert.alert("Error", "Failed to save customer.");
    }
  };

  const submit = async () => {
    if (!selectedCustomer) {
      Alert.alert("Customer required", "Please select or create a customer.");
      return;
    }

    if (Object.values(items).length === 0) {
      Alert.alert("No items", "Please add at least one product.");
      return;
    }

    let deliveryAtValue = null;

    if (deliveryDate && deliveryTime) {
      const finalDate = new Date(deliveryDate);
      finalDate.setHours(deliveryTime.getHours());
      finalDate.setMinutes(deliveryTime.getMinutes());
      finalDate.setSeconds(0);
      deliveryAtValue = finalDate.toISOString();
    }

    try {
      const res = await api.post("/orders", {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.contact,
        customerAddress: selectedCustomer.address,
        platform,
        deliveryAt: deliveryAtValue,
        paymentMethod: "GCASH",
        paymentStatus: "PAID",
        items: Object.values(items),
      });

      Alert.alert("Invoice Created", res.data.invoiceNo);

      setItems({});
      setSelectedCustomer(null);
      setCustomerSearch("");
      setCustomers([]);
      setDeliveryDate(null);
      setDeliveryTime(null);
    } catch {
      Alert.alert("Error", "Failed to create invoice.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Customer</Text>

        <View style={styles.customerBox}>
          <TextInput
            placeholder="Search customer name..."
            placeholderTextColor="#9B8B7A"
            value={customerSearch}
            onChangeText={(value) => {
              setCustomerSearch(value);
              setSelectedCustomer(null);
            }}
            style={styles.input}
          />

          {customerLoading && (
            <Text style={styles.helperText}>Searching customer...</Text>
          )}

          {customerSearch.trim().length >= 2 &&
            customers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedCustomer(customer);
                  setCustomerSearch(customer.name);
                  setCustomers([]);
                  setPlatform(customer.platform || platform);
                }}
                style={styles.customerPill}
              >
                <Text style={styles.customerText}>{customer.name}</Text>
                <Text style={styles.customerSubText}>
                  {customer.platform || "No platform"} •{" "}
                  {customer.address || "No address"}
                </Text>
              </TouchableOpacity>
            ))}

          {customerSearch.trim().length >= 2 &&
            customers.length === 0 &&
            !customerLoading &&
            !selectedCustomer && (
              <TouchableOpacity
                onPress={() => {
                  setNewCustomerName(customerSearch);
                  setCustomerModalOpen(true);
                }}
                style={styles.createCustomerButton}
              >
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.createCustomerText}>
                  Create “{customerSearch}”
                </Text>
              </TouchableOpacity>
            )}

          <TouchableOpacity
            onPress={() => setCustomerModalOpen(true)}
            style={styles.createCustomerButtonAlt}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={COLORS.brown}
            />
            <Text style={styles.createCustomerTextAlt}>
              Create New Customer
            </Text>
          </TouchableOpacity>

          {selectedCustomer && (
            <View style={styles.selectedCustomerBox}>
              <Text style={styles.selectedCustomerText}>
                Selected: {selectedCustomer.name}
              </Text>
              <Text style={styles.selectedCustomerSub}>
                {selectedCustomer.address || "No address"}
              </Text>
            </View>
          )}

          <Text style={styles.smallLabel}>Order Type</Text>

          <View style={styles.platformRow}>
            {["Messenger", "Facebook", "Walk-in", "Instagram"].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPlatform(p)}
                style={[
                  styles.platformPill,
                  platform === p && styles.platformActive,
                ]}
              >
                <Text
                  style={[
                    styles.platformText,
                    platform === p && styles.platformTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.smallLabel}>Preferred Delivery Date</Text>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.pickerButton}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.brown} />
            <Text style={styles.pickerText}>
              {deliveryDate ? formatDate(deliveryDate) : "Select delivery date"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.smallLabel}>Preferred Delivery Time</Text>

          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={styles.pickerButton}
          >
            <Ionicons name="time-outline" size={20} color={COLORS.brown} />
            <Text style={styles.pickerText}>
              {deliveryTime ? formatTime(deliveryTime) : "Select delivery time"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Products</Text>

        <TextInput
          placeholder="Search product or variant..."
          placeholderTextColor="#9B8B7A"
          value={productSearch}
          onChangeText={setProductSearch}
          style={styles.input}
        />

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.brown} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.noResultBox}>
            <Ionicons
              name="search-outline"
              size={28}
              color={COLORS.lightBrown}
            />
            <Text style={styles.noResultText}>No product found</Text>
          </View>
        ) : (
          filteredProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <Text style={styles.productName}>{product.name}</Text>

              {product.variants.map((variant) => {
                const key = `${product.id}-${variant.id}`;
                const qty = items[key]?.quantity || 0;

                return (
                  <View key={variant.id} style={styles.variantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.variantLabel}>{variant.label}</Text>
                      <Text style={styles.price}>
                        Default ₱{variant.price}.00
                      </Text>

                      {qty > 0 && (
                        <TextInput
                          keyboardType="numeric"
                          value={String(items[key].price)}
                          onChangeText={(value) => updatePrice(key, value)}
                          style={styles.priceInput}
                        />
                      )}
                    </View>

                    <View style={styles.qtyBox}>
                      <TouchableOpacity
                        onPress={() => removeItem(product, variant)}
                        style={styles.qtyButtonLight}
                      >
                        <Ionicons
                          name="remove"
                          size={18}
                          color={COLORS.brown}
                        />
                      </TouchableOpacity>

                      <Text style={styles.qty}>{qty}</Text>

                      <TouchableOpacity
                        onPress={() => addItem(product, variant)}
                        style={styles.qtyButton}
                      >
                        <Ionicons name="add" size={18} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}

        <View style={{ height: 180 }} />
      </ScrollView>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Delivery Date</Text>

            <DateTimePicker
              value={deliveryDate || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) setDeliveryDate(selectedDate);
              }}
            />

            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={styles.saveCustomerButton}
            >
              <Text style={styles.saveCustomerText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Delivery Time</Text>

            <DateTimePicker
              value={deliveryTime || new Date()}
              mode="time"
              display="spinner"
              onChange={(event, selectedTime) => {
                if (selectedTime) setDeliveryTime(selectedTime);
              }}
            />

            <TouchableOpacity
              onPress={() => setShowTimePicker(false)}
              style={styles.saveCustomerButton}
            >
              <Text style={styles.saveCustomerText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={customerModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Create Customer</Text>

              <TextInput
                placeholder="Customer name"
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                style={styles.input}
              />

              <TextInput
                placeholder="Contact number"
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                style={styles.input}
              />

              <TextInput
                placeholder="Address"
                value={newCustomerAddress}
                onChangeText={setNewCustomerAddress}
                style={[styles.input, { height: 100 }]}
                multiline
              />

              <TouchableOpacity
                onPress={saveCustomer}
                style={styles.saveButton}
              >
                <Text style={styles.saveText}>Save Customer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCustomerModalOpen(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>Qty: {totalQty}</Text>
          <Text style={styles.total}>₱{total}.00</Text>
        </View>

        <TouchableOpacity onPress={submit} style={styles.createButton}>
          <Ionicons name="receipt-outline" size={20} color={COLORS.white} />
          <Text style={styles.createButtonText}>Create Invoice</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 14,
  },
  customerBox: {
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  input: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    color: COLORS.dark,
    fontWeight: "800",
  },
  helperText: {
    color: COLORS.lightBrown,
    fontWeight: "800",
    marginBottom: 10,
  },
  customerPill: {
    backgroundColor: "#F6EAD7",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  customerText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  customerSubText: {
    color: COLORS.lightBrown,
    fontWeight: "700",
    marginTop: 3,
  },
  createCustomerButton: {
    backgroundColor: COLORS.dark,
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  createCustomerText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  createCustomerButtonAlt: {
    backgroundColor: "#F6EAD7",
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  createCustomerTextAlt: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  selectedCustomerBox: {
    backgroundColor: "#F6EAD7",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  selectedCustomerText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  selectedCustomerSub: {
    color: COLORS.lightBrown,
    marginTop: 3,
    fontWeight: "700",
  },
  smallLabel: {
    color: COLORS.brown,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 8,
  },
  platformRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  platformPill: {
    backgroundColor: "#F6EAD7",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  platformActive: {
    backgroundColor: COLORS.gold,
  },
  platformText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  platformTextActive: {
    color: COLORS.white,
  },
  pickerButton: {
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E8D8BE",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerText: {
    color: COLORS.dark,
    fontWeight: "900",
  },
  noResultBox: {
    backgroundColor: COLORS.card,
    padding: 24,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  noResultText: {
    marginTop: 8,
    color: COLORS.brown,
    fontWeight: "900",
  },
  productCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ECDDC3",
  },
  productName: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 10,
  },
  variantRow: {
    backgroundColor: "#FFFDF8",
    padding: 14,
    borderRadius: 18,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.dark,
  },
  price: {
    marginTop: 4,
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "900",
  },
  priceInput: {
    marginTop: 8,
    backgroundColor: "#F6EAD7",
    borderRadius: 12,
    padding: 10,
    width: 110,
    color: COLORS.dark,
    fontWeight: "900",
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6EAD7",
    borderRadius: 999,
    padding: 5,
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.brown,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonLight: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    width: 34,
    textAlign: "center",
    fontWeight: "900",
    color: COLORS.brown,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: COLORS.cream,
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.brown,
    marginBottom: 16,
  },
  saveCustomerButton: {
    backgroundColor: COLORS.dark,
    padding: 16,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 8,
  },
  saveCustomerText: {
    color: COLORS.white,
    fontWeight: "900",
  },
  cancelButton: {
    padding: 16,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.brown,
    fontWeight: "900",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    padding: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: "#8A7B6A",
    fontWeight: "800",
  },
  total: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.dark,
  },
  createButton: {
    backgroundColor: COLORS.dark,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: "900",
  },
});
