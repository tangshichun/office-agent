def quick_sort(arr):
    """
    快速排序算法实现
    
    参数:
        arr: 待排序的列表
    
    返回:
        排序后的列表
    """
    # 如果列表长度小于等于1，直接返回
    if len(arr) <= 1:
        return arr
    
    # 选择基准元素（这里选择中间元素）
    pivot = arr[len(arr) // 2]
    
    # 将列表分为三部分：小于基准、等于基准、大于基准
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    # 递归排序左右两部分，然后合并
    return quick_sort(left) + middle + quick_sort(right)


def quick_sort_in_place(arr, low=0, high=None):
    """
    原地快速排序算法实现（不创建新列表）
    
    参数:
        arr: 待排序的列表
        low: 起始索引
        high: 结束索引
    """
    if high is None:
        high = len(arr) - 1
    
    if low < high:
        # 获取分区点索引
        pi = partition(arr, low, high)
        
        # 递归排序分区点左侧和右侧
        quick_sort_in_place(arr, low, pi - 1)
        quick_sort_in_place(arr, pi + 1, high)
    
    return arr


def partition(arr, low, high):
    """
    分区函数，用于原地快速排序
    
    参数:
        arr: 待排序的列表
        low: 起始索引
        high: 结束索引
    
    返回:
        分区点的索引
    """
    # 选择最后一个元素作为基准
    pivot = arr[high]
    
    # 小于基准的元素的索引
    i = low - 1
    
    for j in range(low, high):
        # 如果当前元素小于或等于基准
        if arr[j] <= pivot:
            i += 1
            # 交换元素
            arr[i], arr[j] = arr[j], arr[i]
    
    # 将基准元素放到正确的位置
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    
    return i + 1


# 测试代码
if __name__ == "__main__":
    # 测试数据
    test_data = [64, 34, 25, 12, 22, 11, 90, 5, 77, 88]
    
    print("原始数组:", test_data)
    
    # 测试第一种实现（创建新列表）
    sorted_arr = quick_sort(test_data.copy())
    print("快速排序结果（创建新列表）:", sorted_arr)
    
    # 测试第二种实现（原地排序）
    arr_copy = test_data.copy()
    quick_sort_in_place(arr_copy)
    print("快速排序结果（原地排序）:", arr_copy)
    
    # 测试更多用例
    test_cases = [
        [],
        [1],
        [3, 1, 2],
        [5, 4, 3, 2, 1],
        [1, 2, 3, 4, 5],
        [3, 3, 3, 3, 3],
        [10, 7, 8, 9, 1, 5]
    ]
    
    print("\n更多测试用例:")
    for i, test_case in enumerate(test_cases):
        result = quick_sort(test_case.copy())
        print(f"测试用例 {i+1}: {test_case} -> {result}")

    # 性能测试
    import random
    import time
    
    print("\n性能测试:")
    large_array = [random.randint(1, 10000) for _ in range(10000)]
    
    start_time = time.time()
    quick_sort(large_array.copy())
    end_time = time.time()
    print(f"快速排序 10000 个随机数耗时: {end_time - start_time:.4f} 秒")
    
    # 验证排序正确性
    print("\n排序正确性验证:")
    for test in test_cases:
        sorted_result = quick_sort(test.copy())
        python_sorted = sorted(test)
        is_correct = sorted_result == python_sorted
        print(f"{test} -> 快速排序: {sorted_result}, Python内置排序: {python_sorted}, 正确: {is_correct}")